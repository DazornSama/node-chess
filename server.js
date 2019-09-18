'use strict';

// Server port
const PORT = process.env.PORT || 8080;
// Express session signing secret
const SESSION_SECRET = generateSessionSecret();
// Express session cookie max age
const COOKIE_MAXAGE = 60000;

// Modules imports
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const i18n = require('i18n-express');
const favicon = require('serve-favicon');

// Creates express application
let app = express();
// Instantiates an http server
let server = require('http').createServer(app);
let io = require('socket.io')(server);

// Defines JSON as requests and responses body format
app.use(bodyParser.json());
// Defines EJS as views' rendering engine
app.set('view engine', 'ejs');

// Defines express session configuration
let sessionMiddleware = session(
  {
    secret: SESSION_SECRET,
    saveUninitialized: true,
    resave: false,
    cookie: {
      maxAge: COOKIE_MAXAGE
    }
  }
);
app.use(sessionMiddleware);

// Defines express i18n configuration
app.use(i18n(
  {
    translationsPath: path.join(__dirname, 'i18n'),
    siteLangs: [
      'en',
      'it'
    ],
    textsVarName: 'trans'
  }
));

// Loads website favicon
app.use(favicon(path.join(__dirname ,'public/images/favicon.ico')));
// Defines static-files folder
app.use(express.static(path.join(__dirname, 'public')));

// Defines website routes
require('./routes')(app);
// Defines socket communication logic
require('./socket')(io, sessionMiddleware);

// Starts server, listening on a specified port
server.listen(PORT, () => 
{
  console.log('node-chess is listening on port ' + PORT);
});

/**
 * Generate express session secrets array.
 * Only first element is used here.
 * All elements are used on verify step
 * @return {Array} Array of runtime generated secrets
 */
function generateSessionSecret()
{
  let secrets = [];
  let allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!_$?*';

  // Number of secrets to generate
  let verticalLevel = 5;
  // Number of characters for each secret
  let horizontalLevel = 16;

  for(let i = 0; i < verticalLevel; i++)
  {
    let secret = '';

    for(let j = 0; j < horizontalLevel; j++)
    {
      // Random number between 0 and allowedChars characters count
      let index = Math.floor(Math.random() * allowedChars.length);
      // Sums new character to secret 
      secret += allowedChars[index];
    }

    // Condition to verify the current secret is unique
    if(!secrets.includes(secret))
    {
      secrets.push(secret);
    }
  }

  return secrets;
}