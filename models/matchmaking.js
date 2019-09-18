'use strict';

const COLLECTION_NAME = 'matchmaking';
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;

const User = require('./user');
const Game = require('./game');

async function insert(userTag, socketId)
{
  let db = await mongo();

  let match = {
    userTag: userTag,
    socketId: socketId,
    createdAt: new Date()
  };

  await db.collection(COLLECTION_NAME).insertOne(match);
}

async function match(userTag)
{
  let db = await mongo();
  
  let possibleFoe = await db.collection(COLLECTION_NAME).find().sort({ createdAt: 1 }).limit(1).next();
  if(!possibleFoe)
  {
    return;
  }

  let challenger = await User.getByTag(userTag);
  let foe = await User.getByTag(possibleFoe.userTag);

  let game = await Game.create(challenger, foe);
  game.askedAt = possibleFoe.createdAt;
  await Game.update(game);

  await this.remove(foe.socketId);

  return game;
}

async function remove(socketId)
{
  let db = await mongo();
  await db.collection(COLLECTION_NAME).deleteOne({ socketId: socketId });
}

exports.insert = insert;
exports.match = match;
exports.remove = remove;