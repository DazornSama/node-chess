'use strict';

// MongoDB collection name
const COLLECTION_NAME = 'users';
// Password encryption difficulty level
const SALT_ROUNDS = 10;

// Modules import
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcryptjs');
const Game = require('./game');

/**
 * Gets an user by id
 * @param {ObjectId} id User's id
 */
async function getById(id)
{
  // Gets MongoDB instance
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

/**
 * Gets an user by username
 * @param {String} username User's username
 */
async function getByName(username)
{
  // Gets MongoDB instance
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ username: username });
}

/**
 * Gets an user by tag
 * @param {String} tag User's tag
 */
async function getByTag(tag)
{
  // Gets MongoDB instance
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ tag: tag });
}

/**
 * Creates an user
 * @param {String} username User's username
 * @param {String} password User's password
 */
async function create(username, password)
{
  // Gets MongoDB instance
  let db = await mongo();

  // Gets password hash
  let hash = await cryptPassword(password);
  
  // Condition to check if credential combination not refers to an existing user
  let exist = await existUser(username);
  if(exist <= 0)
  {
    let user = {
      username: username,
      hash: hash,
      tag: await generateTag(hash),
      points: 0,
      record: 0,
      createdAt: new Date()
    };

    // Insert document in users collection
    await db.collection(COLLECTION_NAME).insertOne(user);
  }
  else
  {
    // Returns a "user already existing" error
    throw 'auth.signup_username_in_use_feedback';
  }
}

/**
 * Updates an user docuemnt
 * @param {Object} document User's document
 */
async function update(document)
{
  // Gets MongoDB instance
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ username: document.username }, { $set: document });
}

/**
 * Authenticates an existing user
 * @param {String} username User's username
 * @param {String} password User's password
 */
async function authenticate(username, password)
{
  // Gets current user document
  let document = await getByName(username);

  // Condition to check if user exists
  if(document)
  {
    // Condition to check if current password is same as stored
    let sameHash = await comparePassword(password, document.hash);
    if(sameHash)
    {
      // Executes a login operation on the user
      await loginUser(document);
      return document;
    }
    else
    {
      // Return a "wrong password" error
      throw 'auth.login_password_wrong_feedback';
    }
  }
  else
  {
    // Return a "user not found" error
    throw 'auth.login_user_not_found_feedback';
  }
}

/**
 * Validates a client-session credentials pair
 * @param {ObjectId} id User's id
 * @param {String} hash User's password hash
 */
async function validate(id, hash)
{
  // Gets current user document
  let document = await getById(id);

  // Condition to check if user exists
  if(document)
  {
    // Condition to check if session hash is correct
    if(document.hash === hash)
    {
      // Executes a login operation on the user
      await loginUser(document);
      return true;
    }
  }

  return false;
}

/**
 * Links an user to its client socketID
 * @param {ObjectId} id User's id
 * @param {String} socketId User's client socketID
 */
async function linkToSocket(id, socketId)
{
  // Gets MongoDB instance
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { socketId: socketId } });
}

/**
 * Unlinks an user from a socketID
 * @param {ObjectId} id User's id
 */
async function unlinkFromSocket(id)
{
  // Gets MongoDB instance
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { socketId: undefined } });
}

/**
 * Checks if user is in active game
 * @param {ObjectId} id User's id
 * @param {String} socketId User's client socketID
 */
async function isInGame(id, socketId)
{
  // Gets user document
  let user = await getById(id);

  // Condition to check if user exists
  if(user)
  {
    // Condition to check if user is in game
    if(user.gameRoom) 
    {
      // Gets game object
      let game = await Game.getByRoomName(user.gameRoom);

      // Condition to check if game exists
      if(game)
      {
        // Updates user's player object with new socketID
        let player = game.players.find(x => x.userTag === user.tag);
        player.socketId = socketId;

        // Updates game document
        await Game.update(game);
        return game;
      }

      return false;
    }
  }
}

/**
 * Links an user to an active game
 * @param {String} tag User's tag
 * @param {String} gameRoom Active game room
 */
async function linkToGame(tag, gameRoom)
{
  // Gets MongoDB instance
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ tag: tag }, { $set: { gameRoom: gameRoom } });
}

async function getPoints(tag)
{
  let user = await getByTag(tag);
  return {
    record: user.record ? user.record : 0,
    now: user.points ? user.points : 0
  };
}

async function getTop100() {
  let db = await mongo();
  let users = await db.collection(COLLECTION_NAME).find().sort( { points: - 1 } ).limit(100);

  let top = [];

  await db.documentsIterator(users, (user) => 
  {
    top.push(user);
  });

  return top;
}

/**
 * Checks if an user exists by username
 * @param {String} username User's username
 */
async function existUser(username)
{
  // Gets MongoDB instance
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).countDocuments({ username: username });
}

/**
 * Updates login information of user
 * @param {Object} user User's object
 */
async function loginUser(user)
{
  user.lastTimeSeen = new Date();
  // Updates user document
  await update(user);
}

/**
 * Encrypt a password string adn returns the hash value
 * @param {String} password
 */
async function cryptPassword(password)
{
  // Awaits for callback resolution
  return new Promise((res, rej) => 
  {
    // Hashes the password string
    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => 
    {
      if(err) 
      {
        rej(err);
      }

      res(hash);
    });
  });
}

/**
 * Compares a password string to a password hash
 * @param {String} password 
 * @param {String} hash 
 */
async function comparePassword(password, hash)
{
  return await bcrypt.compare(password, hash);
}

/**
 * Generates an user tag starting from password hash
 * @param {String} hash 
 */
async function generateTag(hash)
{
  let tag;
  let alreadyUsed = false;

  // Executes since tag is not already used
  do
  {
    tag = '#';
    let bits = '';

    // Cycle throught all hash characters
    for(let i = 0; i < hash.length; i++)
    {
      // Converts character to its bits value
      bits += hash[i].charCodeAt(0).toString(2);
    }

    let partCount = Math.floor(bits.length / 6);

    // Cycle 6 times
    // From 0 to 5
    for(let i = 0; i < 6; i++)
    {
      // Calculates current offset
      let offset = i * partCount;
      // Calculates current end
      let end = offset + partCount;

      let section = 0;
      // Cycle from offset to end
      for(let j = offset; j < end; j++)
      {
        // Adds numerical sum of bits
        section += parseInt(bits[j]);
      }
      
      let charCode;
      // Condition to check if bits sum is even
      if(section % 2 === 0)
      {
        // Gets a random number for a character (ASCII)
        charCode = Math.floor(Math.random() * 26) + 65;
      }
      else
      {
        // Gets a random number for a number (ASCII)
        charCode = Math.floor(Math.random() * 10) + 48;
      }
      
      // Converts char code to ASCII value
      tag += String.fromCharCode(charCode);
    }

    // Checks if current tag is already used
    alreadyUsed = await isTagAlreadyUsed(tag);
  }
  while(alreadyUsed === true);

  return tag;
}

/**
 * Checks if user tag is already used by another user
 * @param {String} tag User's tag
 */
async function isTagAlreadyUsed(tag)
{
  // Gets MongoDB instance
  let db = await mongo();
  // Gets count of documents using the same tag
  let size = await db.collection(COLLECTION_NAME).countDocuments({ tag: tag });
  return size === 1;
}

exports.getById = getById;
exports.getByName = getByName;
exports.getByTag = getByTag;
exports.create = create;
exports.update = update;
exports.authenticate = authenticate;
exports.validate = validate;
exports.linkToSocket = linkToSocket;
exports.unlinkFromSocket = unlinkFromSocket;
exports.isInGame = isInGame;
exports.linkToGame = linkToGame;
exports.getPoints = getPoints;
exports.getTop100 = getTop100;