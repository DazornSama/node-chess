'use strict';

const COLLECTION_NAME = 'users';
const SALT_ROUNDS = 10;
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcryptjs');

exports.getById = async function(id)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

exports.getByName = async function(username)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ username: username });
}

exports.create = async function(username, password)
{
  let db = await mongo();

  let hash = await cryptPassword(password);
  let exist = await existUser(username);

  if(exist <= 0)
  {
    let user = {
      username: username,
      hash: hash,
      created_at: new Date()
    };

    await db.collection(COLLECTION_NAME).insertOne(user);
  }
  else
  {
    throw 'Username already in use';
  }
}

exports.authenticate = async function(username, password)
{
  let document = await this.getByName(username);

  if(document)
  {
    let sameHash = await comparePassword(password, document.hash);
    
    if(sameHash)
    {
      return document;
    }
    else
    {
      throw 'The password is wrong';
    }
  }
  else
  {
    throw 'User not found';
  }
}

exports.validate = async function(id, hash)
{
  let document = await this.getById(id);

  if(document)
  {
    return document.hash === hash;
  }

  return false;
}

async function existUser(username)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).countDocuments({ username: username });
}

async function cryptPassword(password)
{
  return new Promise((res, rej) => 
  {
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

async function comparePassword(password, hash)
{
  return await bcrypt.compare(password, hash);
}