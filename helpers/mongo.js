'use strict';
const MongoClient = require('mongodb').MongoClient;
const connectionString = process.env.MONGO_DB || 'mongodb://localhost:27017/node-chess';

var instance;

async function connect()
{
  if(instance)
  {
    return instance;
  }

  let client = new MongoClient(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();

  instance = client.db();

  return instance;
}

module.exports = connect;