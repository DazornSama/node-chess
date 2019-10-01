'use strict';

// MongoDB collection name
const COLLECTION_NAME = 'matchmaking';

// Modules import
const mongo = require('../helpers/mongo');
const User = require('./user');
const Game = require('./game');

/**
 * Inserts a match request into matchmaking collecton
 * @param {String} userTag User's tag
 * @param {String} socketId User's cient socketID
 */
async function insert(userTag, socketId)
{
  // Gets MongoDB instance
  let db = await mongo();

  let match = {
    userTag: userTag,
    socketId: socketId,
    createdAt: new Date()
  };

  // Insert document in matchmaking collection
  await db.collection(COLLECTION_NAME).insertOne(match);
}

/**
 * Pair two match requests and start a game
 * @param {String} userTag User's tag
 */
async function match(userTag)
{
  // Gets MongoDB instance
  let db = await mongo();
  
  // Gets a previous match request
  let possibleFoe = await db.collection(COLLECTION_NAME).find().sort({ createdAt: 1 }).limit(1).next();
  // Condition to check if match request exists
  if(!possibleFoe)
  {
    return;
  }

  // Gets current user data
  let challenger = await User.getByTag(userTag);
  // Gets other user data
  let foe = await User.getByTag(possibleFoe.userTag);

  // Creates a new game document
  let game = await Game.create(challenger, foe);
  game.askedAt = possibleFoe.createdAt;
  // Updates game document
  await Game.update(game);

  // Removes other user's match request
  await this.remove(foe.socketId);

  // Return game document
  return game;
}

/**
 * Removes a document from matchmaking collection by user's client socketID
 * @param {String} socketId User's client socketID
 */
async function remove(socketId)
{
  // Gets MongoDB instance
  let db = await mongo();
  // Removes document from matchmaking collection
  await db.collection(COLLECTION_NAME).deleteOne({ socketId: socketId });
}

exports.insert = insert;
exports.match = match;
exports.remove = remove;