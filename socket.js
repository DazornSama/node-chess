'use strict';

// Models objects import
const User = require('./models/user');
const Matchmaking = require('./models/matchmaking');
const Game = require('./models/game');
const History = require('./models/history');

/**
 * Configures socket communication logic
 * @param {SocketIO.Server} io SocketIO server object
 * @param {*} session Express session handler
 */
function configureSocket(io, session)
{
  // Express session SocketIO adapter
  io.use((socket, next) =>
  {
    session(socket.request, socket.request.res, next);
  });

  // Defines socketIO event handlers after client connection
  io.on('connection', async (socket) => 
  {
    // Express session stored user object
    let userId = socket.request.session.user;

    // SocketIO client disconnection handler
    onDisconnect(io, socket, userId);
    
    // Condition to verify the user object exists
    if(!userId)
    {
      // Forces the socketIO client to disconnect and reload the page
      io.to(socket.id).emit('force reload');
      socket.disconnect();
      return;
    }

    // Links user to active socket connection id (on database)
    await User.linkToSocket(userId, socket.id);
    // Notify to all socketIO clients connected that a client has connected
    io.emit('user connected', Object.keys(io.sockets.sockets).length);

    // Condition to check if user is already in an active game
    let game = await User.isInGame(userId);
    if(game)
    {
      // Gets current user object
      let user = await User.getById(userId);
      // Gets current user's player object
      let player = game.players.find(x => x.userTag === user.tag);
      // Updates player's socketID value
      player.socketId = socket.id;

      // Updates current game status (on database)
      await Game.update(game);
      
      // Gets current round's player
      let nextPlayer = game.players.find(x => x.userTag === game.round.by);
      let canMove = nextPlayer === player;

      // Notify current socketIO client reconnection to game
      io.to(socket.id).emit('game resumed', canMove, game);
    }

    // SocketIO chat events handlers
    onGeneralChatMessage(socket);
    onIngameChatMessage(socket);
    onJoinRoom(socket);
    
    // SocketIO game events handlers
    onSearchGame(io, socket);
    onAbortSearchGame(socket);
    onAskForGame(io, socket);
    onAskForGameResult(io, socket);
    onGameReady(io, socket);
    onRequestAuthorizeMovement(io, socket);
    onRequestPawnPromote(io, socket);
    onEndTurn(io, socket);
  });
}

/**
 * Handler for "disconnect" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 * @param {String} userId Current user id
 */
function onDisconnect(io, socket, userId)
{
  socket.on('disconnect', async () => 
  {
    // Removes user from matchmaking queue
    await Matchmaking.remove(socket.id);
    // Unlinks user from active socket connection id (on database)
    await User.unlinkFromSocket(userId);

    // Notify to all socketIO clients connected that a client has disconnected
    io.emit('user disconnected', Object.keys(io.sockets.sockets).length);
  });
}

/**
 * Handler for "general chat message" socketIO event
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onGeneralChatMessage(socket)
{
  socket.on('general chat message', (username, userTag, message) => 
  {
    // Notify to all socketIO clients connected a new general chat message
    socket.broadcast.emit('general chat message', username, userTag, message);
  });
}

/**
 * Handler for "ingame chat message" socketIO event
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onIngameChatMessage(socket)
{
  socket.on('ingame chat message', (gameRoom, username, userTag, message) => 
  {
    // Notify to same-room socketIO client a new game message
    socket.to(gameRoom).emit('ingame chat message', username, userTag, message);
  });
}

/**
 * Handler for "join room" socketIO event
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onJoinRoom(socket)
{
  socket.on('join room', (roomName) => 
  {
    // Joins current socket connection in the specified room's namespace
    socket.join(roomName);
  });
}

/**
 * Handler for "search game" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onSearchGame(io, socket)
{
  socket.on('search game', async (userTag) => 
  {
    // Saerches a game to match with
    let game = await Matchmaking.match(userTag, socket.id);

    // Condition to check if a game was founded
    if(game)
    {
      // Exectues for each player in input array
      await doForEachPlayer(game.players, async (player) => 
      {
        // Links user to game
        await User.linkToGame(player.userTag, game.roomName);
        // Notify to player socketIO client the founded game
        io.to(player.socketId).emit('game found', game);
      });
    }
    else
    {
      // Inserts the match request in the matches' queue
      await Matchmaking.insert(userTag, socket.id);
    }
  });
}

/**
 * Handler for "join room" socketIO event
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onAbortSearchGame(socket)
{
  socket.on('abort search game', async() => 
  {
    // Removes current match request from the matches' queue
    await Matchmaking.remove(socket.id);
  });
}

/**
 * Handler for "ask for game" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onAskForGame(io, socket)
{
  socket.on('ask for game', async(userTag, foeTag) =>
  {
    // Gets the invited user object
    let foe = await User.getByTag(foeTag);

    // Condition to check if foe exists and is online and not already in a game
    if(!foe)
    {
      // Notify to current socketIO client foe does not exists
      socket.emit('ask for game error', 'index.matchmaking.ask_for_game_no_user_text');
    }
    else if(!foe.socketId)
    {
      // Notify to current socketIO client foe is offline
      socket.emit('ask for game error', 'index.matchmaking.ask_for_game_user_off_text');
    }
    else if(foe.in_game)
    {
      // Notify to current socketIO client foe is already in a game
      socket.emit('ask for game error', 'index.matchmaking.ask_for_game_user_ingame_text');
    }
    else
    {
      // Gets master user object
      let challenger = await User.getByTag(userTag);
      // Notify to foe socketIO client the game invite
      io.to(foe.socketId).emit('ask for game', challenger.username, challenger.tag);
    }
  });
}

/**
 * Handler for "ask for game result" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onAskForGameResult(io, socket)
{
  socket.on('ask for game result', async (result, foeTag, challengerTag) => 
  {
    // Gets the master user object
    let challenger = await User.getByTag(challengerTag);
    
    // Condition to check the status of the sent invite
    if(!result)
    {
      // Notify to master user socketIO client foe did not accepted the invite
      io.to(challenger.socketId).emit('ask for game error', 'index.matchmaking.ask_for_game_aborted_text');
    }
    else
    {
      // Gets foe user object
      let foe = await User.getByTag(foeTag);
      // Creates a game instance for master user and foe
      let game = await Game.create(challenger, foe);

      // Executes for each player in input array
      await doForEachPlayer(game.players, async (player) => 
      {
        // Notify to player socketIO client the founded game
        io.to(player.socketId).emit('game found', game);
      });
    }
  });
}

/**
 * Handler for "game ready" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onGameReady(io, socket)
{
  socket.on('game ready', async (roomName, board) => 
  {
    // Gets current game object
    let game = await Game.getByRoomName(roomName);
    // Condition to check if game exists
    if(!game) {
      return;
    }

    // Assigns the first move to "remote" player
    let firstPlayer = Game.setFirstPlayer(game);
    let moves;

    // Exceptions handler to catch a "cheating" error
    try
    {
      // Calculates all possible moves for the current board and units
      moves = Game.calcAllPossibleMoves(board, game, firstPlayer);
      //Game.onKingUnderChess(moves, board, game, firstPlayer);
    }
    catch(err)
    {
      // Declares the winner
      let status = await onCheating(game);
      // Notify players of game end
      io.to(roomName).emit('game end', status);
      return;
    }

    // Executes for each player in input array
    await doForEachPlayer(game.players, async (player) => 
    {
      let canMove = player === firstPlayer;
      player.authorizedMoves = canMove ? moves : [];

      // Notify to player socketIO client next turn
      io.to(player.socketId).emit('next turn', canMove, game);
    });

    // Updates current game status (on database)
    await Game.update(game);
    startRoundCountdown(io, roomName, 0);
  });
}

/**
 * Handler for "request authorize movement" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onRequestAuthorizeMovement(io, socket)
{
  socket.on('request authorize movement', async (roomName, userTag, board, startX, startY, endX, endY) => 
  {
    // Gets current game object
    let game = await Game.getByRoomName(roomName);
    // Condition to check if game exists
    if(!game) 
    {
      return;
    }

    let move;

    // Exceptions handler to catch a "cheating" error
    try
    {
      // Checks if the request movement is possible
      move = Game.checkDoneMovement(board, game, userTag, startX, startY, endX, endY);
    }
    catch(err)
    {
      // Declares the winner
      let status = await onCheating(game);
      // Notify players of game end
      io.to(roomName).emit('game end', status);
      return;
    }

    // Condition to check if the move object is filled
    if(move)
    {
      // Updates current game status (on database)
      await Game.update(game);
      // Notify to current socketIO room's clients to execute the move
      io.to(roomName).emit('do movement', move);
    }
    else
    {
      let player = game.players.find(x => x.userTag === userTag);
      // Notify to player socketIO client he can not execute that move
      io.to(player.socketId).emit('deny movement');
    }
  });
}

function onRequestPawnPromote(io, socket)
{
  socket.on('request pawn promote', async (roomName, userTag, tileX, tileY, unit) =>
  {
    // Gets current game object
    let game = await Game.getByRoomName(roomName);
    // Condition to check if game exists
    if(!game) 
    {
      return;
    }

    let pawn = Game.canPawnBePromoted(game, userTag, tileX, tileY);
    if(pawn)
    {
      await Game.promotePawn(game, pawn, unit);
      io.to(roomName).emit('do pawn promote', pawn);
    }
    else
    {
      let player = game.players.find(x => x.userTag === userTag);
      // Notify to player socketIO client he can not execute that move
      io.to(player.socketId).emit('deny pawn promote');
    }
  });
}

/**
 * Handler for "end turn" socketIO event
 * @param {SocketIO.Server} io SocketIO server object
 * @param {SocketIO.Socket} socket SocketIO socket object
 */
function onEndTurn(io, socket)
{
  socket.on('end turn', async (roomName, board, number) => 
  {
    // Gets current game object
    let game = await Game.getByRoomName(roomName);
    // Condition to check if game exists and passed round number is the current in game
    if(!game || game.round.count !== number) 
    {
      return;
    }

    // Assigns the next move to the appropriate player
    let nextPlayer = Game.setNextPlayer(game);
    let moves;
    let underChess = false;

    // Exceptions handler to catch a "cheating" error
    try
    {
      // Calculates all possible moves for the current board and units
      moves = Game.calcAllPossibleMoves(board, game, nextPlayer);
      underChess = Game.onKingUnderChess(moves, board, game, nextPlayer);
      Game.hasAlreadyDoneSpecialMovement(moves, nextPlayer);
      
      if(Game.isThreeLastMovesIdentically(game, game.players.find(a => a !== nextPlayer)))
      {
        // Declares draw
        let status = await onDraw(game);
        // Notify players of game end
        io.to(roomName).emit('game end', status);
        return;
      }

      if(Game.isAliveIllegalCombination(game))
      {
        // Declares draw
        let status = await onDraw(game);
        // Notify players of game end
        io.to(roomName).emit('game end', status);
        return;
      }

      // Condition to check if player has zero moves
      let movesCount = 0;
      for(let i = 0; i < moves.length; i++)
      {
        movesCount += moves[i].moves.length;
      }

      if(movesCount === 0)
      {
        let status;

        if(Game.isKingUnderChess(board, game, nextPlayer))
        {
          // Declares draw
          status = await onZeroMoves(game);
        }
        else
        {
          // Declares the winner
          status = await onDraw(game);
        }
        
        // Notify players of game end
        io.to(roomName).emit('game end', status);
        return;
      }
    }
    catch(err)
    {
      console.log(err);
      // Declares the winner
      let status = await onCheating(game);
      // Notify players of game end
      io.to(roomName).emit('game end', status);
      return;
    }

    // Executes for each player in input array
    await doForEachPlayer(game.players, async (player) => 
    {
      let canMove = false;
      player.authorizedMoves = [];
      player.underChess = false;
      
      if(player === nextPlayer)
      {
        canMove = true;
        player.authorizedMoves = moves;
        player.underChess = underChess;
      }

      // Notify to player socketIO client next turn
      io.to(player.socketId).emit('next turn', canMove, game);
    });

    // Updates current game status (on database)
    await Game.update(game);
    startRoundCountdown(io, roomName, number);
  });
}

/**
 * Start a 60 seconds countdown to check current turn timeout
 * @param {SocketIO.Server} io SocketIO server object
 * @param {String} roomName Game room name
 * @param {Number} number Game turn number
 */
function startRoundCountdown(io, roomName, number)
{
  // Current round timeout handler 
  setTimeout(async () => {
    // Gets current game object
    let game = await Game.getByRoomName(roomName);
    // Condition to check if game exists
    if(!game) 
    {
      return;
    }

    // Condition to check if the passed round number is the current in game, gets executed after 63,6 seconds from next turn start
    if((number + 1) === game.round.count) {
      // Declares winner
      let status = await onTurnOutOfTime(game);
      // Notify players of game end
      io.to(game.roomName.toString()).emit('game end', status);
    }
  }, 61000);
}

/**
 * Declares the winner and stores the game object
 * @param {Object} game Game object
 */
async function onZeroMoves(game)
{
  let winnerTag = game.players.find(x => x.userTag !== game.round.by).userTag;
  // Declares the winner of the game
  await Game.declareWinner(game, winnerTag, Game.endReasons.CHECK_MATE);

  // Notify to room socketIO clients win
  await History.store(game);

  return game.end;
}

/**
 * Declares the winner and stores the game object
 * @param {Object} game Game object
 */
async function onCheating(game) 
{
  let winnerTag = game.players.find(x => x.userTag !== game.round.by).userTag;
  // Declares the winner of the game
  await Game.declareWinner(game, winnerTag, Game.endReasons.CHEATING);

  // Notify to room socketIO clients win
  await History.store(game);

  return game.end;
}

/**
 * Declares the winner and stores the game object
 * @param {Object} game Game object
 */
async function onTurnOutOfTime(game)
{
  // Declares the winner of the game
  let winnerTag = game.players.find(x => x.userTag !== game.round.by).userTag;
  await Game.declareWinner(game, winnerTag, Game.endReasons.OUT_OF_TIME);

  // Notify to room socketIO clients win
  await History.store(game);

  return game.end;
}

async function onDraw(game)
{
  // Declares a draw game
  await Game.declareDraw(game);

  // Notify to room socketIO clients draw
  await History.store(game);

  return game.end;
}

/**
 * Loops throught players
 * For each cycle calls a callback function
 * @param {Array} players Array of players objects
 * @param {Function} callback Function to call for each object
 */
async function doForEachPlayer(players, callback)
{
  // Cycle throught all players in input array
  for(let i = 0; i < players.length; i++)
  {
    // Await for the exection of the callback function
    await callback(players[i]);
  }
}

module.exports = configureSocket;