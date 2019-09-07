'use strict';

const COLLECTION_NAME = 'users';
const SALT_ROUNDS = 10;
const mongo = require('../helpers/mongo');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcryptjs');

async function getById(id)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

async function getByName(username)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).findOne({ username: username });
}

async function create(username, password)
{
  let db = await mongo();

  let hash = await cryptPassword(password);
  let exist = await existUser(username);

  if(exist <= 0)
  {
    let user = {
      username: username,
      hash: hash,
      tag: await generateTag(hash),
      created_at: new Date()
    };

    await db.collection(COLLECTION_NAME).insertOne(user);
  }
  else
  {
    throw 'auth.signup_username_in_use_feedback';
  }
}

async function update(document)
{
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ username: document.username }, { $set: document });
}

async function authenticate(username, password)
{
  let document = await getByName(username);

  if(document)
  {
    let sameHash = await comparePassword(password, document.hash);
    
    if(sameHash)
    {
      await loginUser(document);
      return document;
    }
    else
    {
      throw 'auth.login_password_wrong_feedback';
    }
  }
  else
  {
    throw 'auth.login_user_not_found_feedback';
  }
}

async function validate(id, hash)
{
  let document = await getById(id);

  if(document)
  {
    await loginUser(document);
    return document.hash === hash;
  }

  return false;
}

async function linkToSocket(id, socketId)
{
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { socketId: socketId } });
}

async function unlinkFromSocket(id)
{
  let db = await mongo();
  await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { socketId: undefined } });
}

async function existUser(username)
{
  let db = await mongo();
  return await db.collection(COLLECTION_NAME).countDocuments({ username: username });
}

async function loginUser(user)
{
  user.last_time_seen = new Date();
  await update(user);
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

async function generateTag(hash)
{
  let tag;
  let alreadyUsed = false;

  do
  {
    tag = '#';
    let bits = '';

    for(let i = 0; i < hash.length; i++)
    {
      bits += hash[i].charCodeAt(0).toString(2);
    }

    let partCount = Math.floor(bits.length / 6);

    for(let i = 0; i < 6; i++)
    {
      let offset = i * partCount;
      let end = offset + partCount;

      let section = 0;
      for(let j = offset; j < end; j++)
      {
        section += parseInt(bits[j]);
      }
      
      let charCode;
      if(section % 2 === 0)
      {
        charCode = Math.floor(Math.random() * 26) + 65;
      }
      else
      {
        charCode = Math.floor(Math.random() * 10) + 48;
      }
      
      tag += String.fromCharCode(charCode);
    }

    alreadyUsed = await isTagAlreadyUsed(tag);
  }
  while(alreadyUsed === true);

  return tag;
}

async function isTagAlreadyUsed(tag)
{
  let db = await mongo();
  let size = await db.collection(COLLECTION_NAME).countDocuments({ tag: tag });
  return size === 1;
}

exports.getById = getById;
exports.getByName = getByName;
exports.create = create;
exports.update = update;
exports.authenticate = authenticate;
exports.validate = validate;
exports.linkToSocket = linkToSocket;
exports.unlinkFromSocket = unlinkFromSocket;