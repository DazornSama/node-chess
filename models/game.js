'use strict';

const COLLECTION_NAME = 'games';
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;

const chess = require('../helpers/chess');

async function getById(id)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

async function getByRoomName(roomName) {
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

function calcAllPossibleMoves(board, game, player)
{
  let moves = chess.calcAllPossibleMoves(board, game, player);

  if(player.cheated)
  {
    throw 'Hai usato trucchi';
  }
  
  return moves;
}

function setFirstPlayer(game)
{
  let player = game.players.find(x => x.class === 'remote').userTag;

  game.startedAt = new Date();
  game.round = {
    count: 1,
    by: player,
    startedAt: new Date()
  };

  return player;
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
    
    let foe = game.players.find(x => x !== player);
    let deadUnit = foe.units.find(a =>  a.x === move.x && a.y === move.y);

    if(deadUnit)
    {
      foe.graveyard.push(deadUnit);

      let start = foe.units.indexOf(deadUnit);
      foe.units.splice(start, 1);
    }
    
    move.originX = unit.x;
    move.originY = unit.y;

    let newunit = player.units.find(a => a.x === unit.x && a.y === unit.y);
    newunit.x = move.x;
    newunit.y = move.y;

    game.rounds.push({
      number: game.round.count,
      by: game.round.by,
      move: move
    });

    return move;
  }
  catch
  {
    return false;
  }
}

function setNextPlayer(game)
{
  let player = game.players.find(x => x.userTag === game.round.by);
  let nextPlayer = game.players.find(x => x !== player);

  game.round.count++;
  game.round.by = nextPlayer.userTag;
  game.round.startedAt = new Date();

  return player;
}

exports.getById = getById;
exports.getByRoomName = getByRoomName;
exports.create = create;
exports.update = update;
exports.calcAllPossibleMoves = calcAllPossibleMoves;
exports.setFirstPlayer = setFirstPlayer;
exports.checkDoneMovement = checkDoneMovement;
exports.setNextPlayer = setNextPlayer;