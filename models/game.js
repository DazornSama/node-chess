'use strict';

const COLLECTION_NAME = 'games';
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;

const chess = require('../helpers/chess');
const User = require('./user');

const END_REASONS = {
  CHECK_MATE: 0,
  DRAW: 1,
  OUT_OF_TIME: 2,
  CHEATING: 3
};

async function getById(id)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

async function getByRoomName(roomName)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ roomName: roomName });
}

async function create(challenger, foe)
{
  let db = await mongo();

  let roomName = new Date().getTime();

  let game = {
    players: [
      {
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

  await db.collection(COLLECTION_NAME).insertOne(game);

  return game;
}

async function update(document)
{
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ roomName: document.roomName }, { $set: document });
}

async function remove(game)
{
  let db = await mongo();
  await db.collection(COLLECTION_NAME).deleteOne({ roomName: game.roomName });  
}

function calcAllPossibleMoves(board, game, player)
{
  let moves = chess.calcAllPossibleMoves(board, game, player);

  if(player.cheated)
  {
    throw 'Hai usato trucchi';
  }
  
  return moves;
}

function onKingUnderChess(moves, board, game, player) {
  return chess.onKingUnderChess(moves, board, game, player);
}

function setFirstPlayer(game)
{
  let player = game.players.find(x => x.class === 'remote');

  game.startedAt = new Date();
  game.round = {
    count: 1,
    by: player.userTag,
    startedAt: new Date()
  };

  return player;
}

function isKingUnderChess(board, game, player)
{
  let foe = game.players.find(x => x !== player);
  let units = player.units.concat(foe.units);
  let king = player.units.find(x => x.u === 6);

  return chess.isKingUnderChess(board, foe.units, units, king);
}

function checkDoneMovement(board, game, userTag, startX, startY, endX, endY)
{
  let player = game.players.find(x => x.userTag === userTag);
  let moves;

  try
  {
    moves = calcAllPossibleMoves(board, game, player);
  }
  catch(err)
  {
    throw err;
  }

  try
  {
    let unit = moves.find(a => a.x === startX && a.y === startY);
    let move = unit.moves.find(a => a.x === endX && a.y === endY);

    if(move.side)
    {
      if(!hasAlreadyDoneSpecialMovement(player, move.side.type))
      {
        let newunit = player.units.find(a => a.x === move.side.originX && a.y === move.side.originY);
        newunit.x = move.side.x;
        newunit.y = move.side.y;

        player.specialMoves.push(move.side.type);
      }
      else
      {
        return false;
      }
    }

    if(unit.u === 2 || unit.u === 6)
    {
      unit.f = false;

      let canCastling = false;
      for(let i = 0; i < player.units.length; i++)
      {
        let u = player.units[i];
        if(u.u === 2 || u.u === 6)
        {
          if(u.f)
          {
            canCastling = true;
          }
        }
      }

      if(!canCastling)
      {
        let specialMoves = player.specialMoves ? player.specialMoves : [];
        specialMoves.push('castling');
        player.specialMoves = specialMoves;
      }
    }
    
    let foe = game.players.find(x => x !== player);
    let deadUnit = foe.units.find(a =>  a.x === move.x && a.y === move.y);

    if(deadUnit)
    {
      foe.graveyard.push(deadUnit);
      move.d = deadUnit.u;

      let start = foe.units.indexOf(deadUnit);
      foe.units.splice(start, 1);
    }
    
    move.originX = unit.x;
    move.originY = unit.y;
    move.u = unit.u;

    let newunit = player.units.find(a => a.x === unit.x && a.y === unit.y);
    newunit.x = move.x;
    newunit.y = move.y;

    if(move.first)
    {
      newunit.f = true;
    }

    game.rounds.push({
      number: game.round.count,
      by: game.round.by,
      move: move
    });

    return move;
  }
  catch(err)
  {
    return false;
  }
}

function canPawnBePromoted(game, userTag, x, y)
{
  y = parseInt(y);
  x = parseInt(x);

  if(y !== 1 && y !== 8)
  {
    return;
  }

  let player = game.players.find(x => x.userTag === userTag);
  let unit = player.units.find(a => a.x === x && a.y === y);

  if(!unit || unit.u !== 1)
  {
    return;
  }

  return unit;
}

async function promotePawn(game, pawn, unit)
{
  unit = parseInt(unit);
  
  for(let i = 0; i < game.players.length; i++)
  {
    let p = game.players[i].units.find(x => x === pawn);

    if(p)
    {
      p.u = unit;
    }
  }

  await update(game);
}

function hasAlreadyDoneSpecialMovement(moves, player)
{
  let illegalMoves = [];

  for(let i = 0; i < moves.length; i++)
  {
    let move = moves[i];

    for(let j = (move.moves.length - 1); j >= 0; j--)
    {
      let m = move.moves[j];

      if(!m)
      {
        continue;
      }

      if(m.side !== undefined)
      {
        let specialMoves = player.specialMoves ? player.specialMoves : [];
        let done = specialMoves.includes(m.side.type);

        if(done)
        {
          illegalMoves.push([i, j]);
        }

        player.specialMoves = specialMoves;
      }
    }
  }

  for(let i = 0; i < illegalMoves.length; i++)
  {
    moves[illegalMoves[i][0]].moves.splice(illegalMoves[i][1], 1);
  }

  return illegalMoves.length > 0;
}

function isThreeLastMovesIdentically(game, player)
{
  let count = 0;
  let lastMove;

  let start = game.rounds.length - 1;
  let end = start - 12;

  if(end < 0)
  {
    end = 0;
  }

  for(let i = start; i >= end; i--)
  {
    let round = game.rounds[i];

    if(round.by === player.userTag)
    {
      if(count >= 3)
      {
        continue;
      }
      else if(!lastMove || (lastMove.x === round.move.x && lastMove.y === round.move.y && lastMove.u === round.move.u))
      {
        lastMove = round.move;
        count++;
      }
    }
  }

  return count >= 3;
}

function isAliveIllegalCombination(game) {
  let units = [];

  for(let i = 0; i < game.players.length; i++)
  {
    let player = game.players[i];

    for(let j = 0; j < player.units.length; j++)
    {
      units.push(player.units[j].u);
    }
  }

  let sum = 0;
  for(let i = 0; i < units.length; i++)
  {
    sum += units[i];
  }

  // Condition to check if just two kings alive (12)
  // Condition to check if two kings and a bishop alive (15)
  // Conidition to check if two kings and an horse alive (16)
  if(sum === 12 ||
    sum === 15 ||
    sum === 16)
  {
    return true;
  }

  return false;
}

function setNextPlayer(game)
{
  let player = game.players.find(x => x.userTag === game.round.by);
  let nextPlayer = game.players.find(x => x !== player);

  game.round.count++;
  game.round.by = nextPlayer.userTag;
  game.round.startedAt = new Date();

  return nextPlayer;
}

async function declareWinner(game, userTag, reason) 
{
  let winner = game.players.find(x => x.userTag === userTag);
  let loser = game.players.find(x => x !== winner);

  await calcEndGamePoints(winner.userTag, true, reason);
  await calcEndGamePoints(loser.userTag, false, reason);

  game.round = undefined;
  game.end = {
    at: new Date(),
    by: winner.userTag,
    status: reason
  };

  await update(game);
}

async function declareDraw(game)
{
  game.round = undefined;
  game.end = {
    at: new Date(),
    status: END_REASONS.DRAW
  };

  await update(game);
}

async function calcEndGamePoints(userTag, winner, reason)
{
  let user = await User.getByTag(userTag);
  let points = 0;

  switch(reason)
  {
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

  if(user.points < 0)
  {
    user.points = 0;
  }
  else if(user.points > 7000)
  {
    user.points  = 7000;
  }

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