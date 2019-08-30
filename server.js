'use strict';

const PORT = process.env.PORT || 8080;
const SECRET_LEVELS = [5, 16];
const SESSION_SECRET = generateSessionSecret();
const COOKIE_MAXAGE = 60000;

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const favicon = require('serve-favicon');

let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(session(
  {
    secret: SESSION_SECRET,
    saveUninitialized: true,
    resave: false,
    cookie: {
      maxAge: COOKIE_MAXAGE
    }
  }
));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.static(path.join(__dirname + '/public')));

require('./routes')(app);
require('./socket')(io);

server.listen(PORT, () => 
{
  console.log('node-chess is listening on port ' + PORT);
});

function generateSessionSecret()
{
  let secrets = [];
  let allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!_$?*';
  let verticalLevel = SECRET_LEVELS[0] || 5;
  let horizontalLevel = SECRET_LEVELS[1] || 16;

  for(let i = 0; i < verticalLevel; i++)
  {
    let secret = '';

    for(let j = 0; j < horizontalLevel; j++)
    {
      let index = Math.floor(Math.random() * allowedChars.length);
      secret += allowedChars[index];
    }

    if(!secrets.includes(secret))
    {
      secrets.push(secret);
    }
  }

  console.log(secrets);
  return secrets;
}