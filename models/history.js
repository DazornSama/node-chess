'use strict';

// MongoDB collection name
const COLLECTION_NAME = 'history';
const DAYS_TOBE_OLDER = 7;

// Modules import
const mongo = require('../helpers/mongo');
const Game = require('./game');

/**
 * Stores a completed game into history collection
 * @param {Object} game Game object
 */
async function store(game) 
{
  // Gets MongoDB instance
  let db = await mongo();

  // Removes stored games older than 1 week (7 days)
  await removeOlderThan(DAYS_TOBE_OLDER);

  // Insert document in history collecton
  await db.collection(COLLECTION_NAME).insertOne(game);
  // Hides document
  await Game.remove(game);
}

/**
 * Hides documents older than "n" days
 * @param {Number} n Days older
 */
async function removeOlderThan(n) 
{
  // Gets MongoDB instance
  let db = await mongo();

  // Gets current time
  let now = new Date();
  // Removes "n" days from current time
  now.setDate(now.getDate() - n);

  // Hides older documents
  let documents = await db.collection(COLLECTION_NAME).find({ createdAt: { $lt: now }, old: { $ne: true } });
  await db.documentsIterator(documents, async (document) => 
  {
    await db.collection(COLLECTION_NAME).updateOne({ roomName: document.roomName }, { $set: { old: true } });
  });
}

async function countUserGame(userTag) {
  await removeOlderThan(DAYS_TOBE_OLDER);

  let count = {
    total: 0,
    won: 0,
    lost: 0
  };
  let db = await mongo();

  let games = await db.collection(COLLECTION_NAME).find();
  await db.documentsIterator(games, async (game) => 
  {
    count.total++;

    if(!game.end.by)
    {
      return;
    }
    else if(game.end.by === userTag)
    {
      count.won++;
    }
    else
    {
      count.lost++;
    }
  });

  return count;
}

exports.store = store;
exports.countUserGame = countUserGame;