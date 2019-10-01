'use strict';

// Modules import
const path = require('path');
const User = require('../models/user');

/**
 * Handler for "/" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.index = async function(req, res)
{
  // By default first view to show is the authorization one
  let viewName = 'auth';
  let user;

  // Condition to check if a user session exists
  if(req.session.user)
  {
    viewName = 'index';
    // Gets user data
    user = await User.getById(req.session.user);
  }
  
  // Renders the right view with EJS
  res.render(path.join(__dirname + '/../views/' + viewName + '.ejs'), { user: user });
}

/**
 * Handler for "/logout" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.logout = async function(req, res)
{
  // Destroys all sessions of current node
  req.session.destroy();
  // Renders the logout view with EJS
  res.render(path.join(__dirname + '/../views/logout.ejs'), { user: undefined });
}