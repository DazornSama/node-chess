'use strict';

const COLLECTION_NAME = 'history';
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;

const Game = require('./game');

async function store(game) 
{
  let db = await mongo();

  await removeOldThanOneWeek();

  await db.collection(COLLECTION_NAME).insertOne(game);
  await Game.remove(game);
}

async function removeOldThanOneWeek() {
  let db = await mongo();

  let now = new Date();
  now.setDate(now.getDate() - 7);

  await db.collection(COLLECTION_NAME).deleteMany({ createdAt: { $lt: now } });
}

exports.store = store;