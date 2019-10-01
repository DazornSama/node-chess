'use strict';

// MongoDB collection name
const COLLECTION_NAME = 'history';

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
  await removeOlderThan(7);

  // Insert document in history collecton
  await db.collection(COLLECTION_NAME).insertOne(game);
  // Removes document from games collection
  await Game.remove(game);
}

/**
 * Removes documents older than "n" days
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

  // Removes older documents from history collection
  await db.collection(COLLECTION_NAME).deleteMany({ createdAt: { $lt: now } });
}

exports.store = store;