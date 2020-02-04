'use strict';

// MongoDB collection name
const COLLECTION_NAME = 'games';

// Modules import
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;
const chess = require('../helpers/chess');
const User = require('./user');

// Game end reasons enum
const END_REASONS = {
  CHECK_MATE: 0,
  DRAW: 1,
  OUT_OF_TIME: 2,
  CHEATING: 3
};

/**
 * Gets a game by id
 * @param {ObjectId} id Game's id
 */
async function getById(id) {
  // Gets MongoDB instance
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({
    _id: new ObjectId(id)
  });
}

/**
 * Gets a game by room name
 * @param {String} roomName Game's room name
 */
async function getByRoomName(roomName) {
  // Gets MongoDB instance
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({
    roomName: roomName
  });
}

async function getAll() {
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).find({});
}

/**
 * Creates a new game instance
 * @param {Object} challenger
 * @param {Object} foe 
 */
async function create(challenger, foe) {
  // Gets MongoDB instance
  let db = await mongo();

  let roomName = new Date().getTime();

  let game = {
    players: [{
        userTag: challenger.tag,
        socketId: challenger.socketId,
        username: challenger.username,
        units: chess.generateUnits(false),
        graveyard: [],
        class: 'local'
      },
      {
        userTag: foe.tag,
        socketId: foe.socketId,
        username: foe.username,
        units: chess.generateUnits(true),
        graveyard: [],
        class: 'remote'
      }
    ],
    rounds: [],
    roomName: roomName,
    createdAt: new Date()
  };

  // Insert document in games collection
  await db.collection(COLLECTION_NAME).insertOne(game);

  return game;
}

/**
 * Updates a game document
 * @param {Object} document Game's document
 */
async function update(document) {
  // Gets MongoDB instance
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({
    roomName: document.roomName
  }, {
    $set: document
  });
}

/**
 * Removes a document from games collection
 * @param {Object} game Game's object
 */
async function remove(game) {
  // Gets MongoDB instance
  let db = await mongo();
  await db.collection(COLLECTION_NAME).deleteOne({
    roomName: game.roomName
  });
}

/**
 * Calculates all moves a player can do in a specific turn
 * @param {Object} board Chess board object
 * @param {Object} game Game's object
 * @param {Object} player Player object
 */
function calcAllPossibleMoves(board, game, player) {
  // Gets all moves
  let moves = chess.calcAllPossibleMoves(board, game, player);

  // Condition to check if player has cheated
  if (player.cheated) {
    throw 'Hai usato trucchi';
  }

  return moves;
}

/**
 * Calculates illegal moves to avoid to put current player's king under chess
 * @param {Array} moves Moves array
 * @param {Object} board Chess board object
 * @param {Object} game Game's object
 * @param {Object} player Player object
 */
function onKingUnderChess(moves, board, game, player) {
  return chess.onKingUnderChess(moves, board, game, player);
}

/**
 * Sets the first player of a game
 * @param {Object} game Game's object
 */
function setFirstPlayer(game) {
  // Gets first player
  let player = game.players.find(x => x.class === 'remote');

  game.startedAt = new Date();
  game.round = {
    count: 1,
    by: player.userTag,
    startedAt: new Date()
  };

  return player;
}

/**
 * Checks if the player's king unit is under chess
 * @param {Object} board Chess board object
 * @param {Object} game Game's object
 * @param {Object} player Player object
 */
function isKingUnderChess(board, game, player) {
  // Gets the player's foe
  let foe = game.players.find(x => x !== player);
  // Gets all board units
  let units = player.units.concat(foe.units);
  // Gets the player's king unit
  let king = player.units.find(x => x.u === chess.UNITS.KING);

  return chess.isKingUnderChess(board, foe.units, units, king);
}

/**
 * Checks if requested movement is legal and apply it
 * @param {Object} board Chess board object
 * @param {Object} game Game's object
 * @param {String} userTag Player's tag
 * @param {Number} startX Movement horizontal axis starting value
 * @param {Number} startY Movement vertical axis starting value
 * @param {Number} endX Movement horizontal axis final value
 * @param {Number} endY Movement vertical axis final value
 */
function checkDoneMovement(board, game, userTag, startX, startY, endX, endY) {
  // Gets current player
  let player = game.players.find(x => x.userTag === userTag);
  let moves;

  try {
    // Calculates all moves in current turn
    moves = calcAllPossibleMoves(board, game, player);
  } catch (err) {
    throw err;
  }

  try {
    // Gets current movement's unit
    let unit = moves.find(a => a.x === startX && a.y === startY);
    // Gets current movement's unit move
    let move = unit.moves.find(a => a.x === endX && a.y === endY);

    // Condition to check if move has side effects
    if (move.side) {
      // Condition to check if player can do a special movement
      if (!hasAlreadyDoneSpecialMovement(player, move.side.type)) {
        // Updates side unit position
        let newunit = player.units.find(a => a.x === move.side.originX && a.y === move.side.originY);
        newunit.x = move.side.x;
        newunit.y = move.side.y;

        // Adds current special movement to done array
        player.specialMoves.push(move.side.type);
      } else {
        return false;
      }
    }

    // Condition to check if movement's unit is turret or king
    if (unit.u === chess.UNITS.TURRET || unit.u === chess.UNITS.KING) {
      unit.f = false;

      let canCastling = false;
      // Cycle throught all player's units
      for (let i = 0; i < player.units.length; i++) {
        // Gets current unit
        let u = player.units[i];
        // Condition to check if current unit is turret or king
        if (u.u === chess.UNITS.TURRET || u.u === chess.UNITS.KING) {
          // Condition to check if current unit has done zero movements
          if (u.f) {
            canCastling = true;
          }
        }
      }

      // Condition to check if player can do "castling" movement
      if (!canCastling) {
        // Adds "castling" movement to done array
        let specialMoves = player.specialMoves ? player.specialMoves : [];
        specialMoves.push('castling');
        player.specialMoves = specialMoves;
      }
    }

    // Gets player's foe
    let foe = game.players.find(x => x !== player);
    // Gets a possible dead unit after the move
    let deadUnit = foe.units.find(a => a.x === move.x && a.y === move.y);

    // Condition to check if dead unit exists
    if (deadUnit) {
      // Adds dead unit to the graveyard
      foe.graveyard.push(deadUnit);
      move.d = deadUnit.u;

      // Removes dead unit from board
      let start = foe.units.indexOf(deadUnit);
      foe.units.splice(start, 1);
    }

    move.originX = unit.x;
    move.originY = unit.y;
    move.u = unit.u;

    // Updates movement's unit position
    let newunit = player.units.find(a => a.x === unit.x && a.y === unit.y);
    newunit.x = move.x;
    newunit.y = move.y;

    // Condition to check if is first move for movement's unit move
    if (move.first) {
      newunit.f = true;
    }

    // Adds the round to rounds history array
    game.rounds.push({
      number: game.round.count,
      by: game.round.by,
      move: move
    });

    return move;
  } catch (err) {
    return false;
  }
}

/**
 * Checks if a pawn unit can be promoted
 * @param {Object} game Game's object
 * @param {String} userTag Player's tag 
 * @param {Number} x Unit's horizontal axis value
 * @param {Number} y Unit's vertical axis value
 */
function canPawnBePromoted(game, userTag, x, y) {
  y = parseInt(y);
  x = parseInt(x);

  // Condition to check if unit is on vertical limit of the board
  if (y !== 1 && y !== 8) {
    return;
  }

  // Gets current player
  let player = game.players.find(x => x.userTag === userTag);
  // Gets axis values unit
  let unit = player.units.find(a => a.x === x && a.y === y);

  // Condition to check if unit exists and is pawn
  if (!unit || unit.u !== chess.UNITS.PAWN) {
    return;
  }

  return unit;
}

/**
 * Updates a pawn to new type of unit
 * @param {Object} game Game's object
 * @param {Object} pawn Unit to promote object
 * @param {chess.UNITS} unit Unit type
 */
async function promotePawn(game, pawn, unit) {
  unit = parseInt(unit);

  // Cycle throught all players
  for (let i = 0; i < game.players.length; i++) {
    // Gets current player's pawn to promote
    let p = game.players[i].units.find(x => x === pawn);

    // Condition to check if pawn exists
    if (p) {
      p.u = unit;
    }
  }

  await update(game);
}

/**
 * Checks if player has already done a specific special movement
 * @param {Array} moves Moves array
 * @param {Object} player Player object
 */
function hasAlreadyDoneSpecialMovement(moves, player) {
  let illegalMoves = [];

  // Cycle throught all moves
  for (let i = 0; i < moves.length; i++) {
    // Gets current movement
    let move = moves[i];

    // Cycle throught all moves of current movement
    // From end to zero
    for (let j = (move.moves.length - 1); j >= 0; j--) {
      // Gets current movement's move
      let m = move.moves[j];

      // Condition to check if movement's move exists
      if (!m) {
        continue;
      }

      // Condition to check if movement's move has a side effect
      if (m.side !== undefined) {
        let specialMoves = player.specialMoves ? player.specialMoves : [];
        let done = specialMoves.includes(m.side.type);

        // Condition to check if player's special moves array contains current special movement
        if (done) {
          // Adds movement's move to illegal moves array 
          illegalMoves.push([i, j]);
        }

        player.specialMoves = specialMoves;
      }
    }
  }

  // Cycle throughe all illegal moves
  for (let i = 0; i < illegalMoves.length; i++) {
    // Removes current illegal move from moves array
    moves[illegalMoves[i][0]].moves.splice(illegalMoves[i][1], 1);
  }

  return illegalMoves.length > 0;
}

/**
 * Checks if player has done the same move in the past 3 rounds
 * @param {Object} game Game's object 
 * @param {Object} player Player object
 */
function isThreeLastMovesIdentically(game, player) {
  let count = 0;
  let lastMove;

  // Sets start as the last round
  let start = game.rounds.length - 1;

  // Sets the end as 12 rounds before last
  // Same move can be done each 2 turn
  // A player move each 2 turn
  // (2 * 2) * 3 = 12
  let end = start - 12;

  // Condition to check if exists rounds to control
  if (end < 0) {
    end = 0;
  }

  // Cycle from start to end
  for (let i = start; i >= end; i--) {
    // Gets current round
    let round = game.rounds[i];

    // Condition to check if round was done by current player
    if (round.by === player.userTag) {
      // Condition to check if same move happens more than 3 times
      if (count >= 3) {
        continue;
      }
      // Condition to check if current move is equal to last move registered
      else if (!lastMove || (lastMove.x === round.move.x && lastMove.y === round.move.y && lastMove.u === round.move.u)) {
        lastMove = round.move;
        count++;
      }
    }
  }

  return count >= 3;
}

/**
 * Checks if remaining units in game are unable to win
 * @param {Object} game Game's object
 */
function isAliveIllegalCombination(game) {
  let units = [];

  // Cycle throught all players
  for (let i = 0; i < game.players.length; i++) {
    // Gets current player
    let player = game.players[i];

    // Cycle throught all player's units
    for (let j = 0; j < player.units.length; j++) {
      // Adds current unit type
      units.push(player.units[j].u);
    }
  }

  let sum = 0;
  // Cycle throught all alive units
  for (let i = 0; i < units.length; i++) {
    sum += units[i];
  }

  // Condition to check if just two kings alive (12)
  // Condition to check if two kings and a bishop alive (15)
  // Conidition to check if two kings and an horse alive (16)
  if (sum === 12 ||
    sum === 15 ||
    sum === 16) {
    return true;
  }

  return false;
}

/**
 * Sets the next round player
 * @param {Object} game Game's object
 */
function setNextPlayer(game) {
  // Gets current player
  let player = game.players.find(x => x.userTag === game.round.by);
  // Gets next round player
  let nextPlayer = game.players.find(x => x !== player);

  // Updates round values
  game.round.count++;
  game.round.by = nextPlayer.userTag;
  game.round.startedAt = new Date();

  return nextPlayer;
}

/**
 * Declares a winner and a loser on game end
 * @param {Object} game Game's object
 * @param {String} userTag Winner's tag 
 * @param {END_REASONS} reason Reason of game end
 */
async function declareWinner(game, userTag, reason) {
  // Gets the winner
  let winner = game.players.find(x => x.userTag === userTag);
  // Gets the loser
  let loser = game.players.find(x => x !== winner);

  // Calculates winner and loser points additions
  await calcEndGamePoints(winner.userTag, true, reason);
  await calcEndGamePoints(loser.userTag, false, reason);

  game.round = undefined;
  game.end = {
    at: new Date(),
    by: winner.userTag,
    status: reason
  };

  // Updates game document
  await update(game);
}

/**
 * Declares a draw game end
 * @param {Object} game Game's object
 */
async function declareDraw(game) {
  game.round = undefined;
  game.end = {
    at: new Date(),
    status: END_REASONS.DRAW
  };

  // Updates game document
  await update(game);
}

/**
 * Calculates player points on end game
 * @param {String} userTag Player's tag
 * @param {Boolean} winner Is the player the winner?
 * @param {END_REASONS} reason Reason of game end
 */
async function calcEndGamePoints(userTag, winner, reason) {
  // Gets current player's user object
  let user = await User.getByTag(userTag);
  let points = 0;

  // Switches game end reason
  switch (reason) {
    case END_REASONS.CHECK_MATE:
      points = winner ? 15 : -15;
      break;
    case END_REASONS.OUT_OF_TIME:
      points = winner ? 10 : -5;
      break;
    case END_REASONS.CHEATING:
      points = winner ? 10 : -30;
      break;
  }

  user.points += points;

  // Condition to check if new user points are less than zero
  if (user.points < 0) {
    user.points = 0;
  }
  // Condition to check if new user points are greater than 7000
  else if (user.points > 7000) {
    user.points = 7000;
  }

  if (user.points > user.record) {
    user.record = user.points;
  }

  // Updates user document
  await User.update(user);
}

exports.getById = getById;
exports.getByRoomName = getByRoomName;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.calcAllPossibleMoves = calcAllPossibleMoves;
exports.isKingUnderChess = isKingUnderChess;
exports.onKingUnderChess = onKingUnderChess;
exports.hasAlreadyDoneSpecialMovement = hasAlreadyDoneSpecialMovement;
exports.isThreeLastMovesIdentically = isThreeLastMovesIdentically;
exports.isAliveIllegalCombination = isAliveIllegalCombination;
exports.setFirstPlayer = setFirstPlayer;
exports.checkDoneMovement = checkDoneMovement;
exports.canPawnBePromoted = canPawnBePromoted;
exports.promotePawn = promotePawn;
exports.setNextPlayer = setNextPlayer;
exports.declareWinner = declareWinner;
exports.declareDraw = declareDraw;
exports.endReasons = END_REASONS;
exports.getAll = getAll;