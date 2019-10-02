'use strict';

// Modules import
const MongoClient = require('mongodb').MongoClient;

// MongoDB location connection string
const connectionString = process.env.MONGO_DB || 'mongodb://localhost:27017/node-chess';

var instance;

/**
 * Singleton method to instantiate a connection with MongoDB just once if not already exists
 * @returns {Db} MongoDB database instance
 */
async function connect()
{
  // Condition to check if istance has no value
  if(instance)
  {
    return instance;
  }

  // Creates a new MongoClient instance
  let client = new MongoClient(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
  // Try to connect to MongoDB instance
  await client.connect();

  // Assigns current connection database to instance object 
  instance = client.db();
  // Implements a custom method to cycle throught a set of documents (cursor)
  instance.documentsIterator = async function(documents, callback)
  {
    let document;
    // Executes since next document exists
    while((document = await documents.next()))
    {
      await callback(document);
    }
  }

  return instance;
}

module.exports = connect;