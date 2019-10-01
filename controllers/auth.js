'use strict';

// Modules import
const response = require('../helpers/response');
const User = require('../models/user');

/**
 * Handler for "/auth/signup" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.signup = async function(req, res)
{
  try
  {
    // Formats request body parameters
    let username = escape(req.body.username);
    let password = escape(req.body.password);

    // Creates a new user
    await User.create(username, password);

    response.success(res);
  }
  catch(err)
  {
    response.error(res, err);
  }
}

/**
 * Handler for "/auth/login" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.login = async function(req, res)
{
  try
  {
    // Formats request body parameters
    let username = escape(req.body.username);
    let password = escape(req.body.password);

    // Try to authenticate user
    let user = await User.authenticate(username, password);

    // Sets the user session value
    req.session.user = user._id;

    response.success(res, user);
  }
  catch(err)
  {
    response.error(res, err);
  }
}

/**
 * Handler for "/auth/validate" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.validate = async function(req, res)
{
  try
  {
    // Gets request body parameter
    let id = req.body.id;
    let hash = req.body.hash;

    // Condition to check if request data refers to an user
    if(await User.validate(id, hash))
    {
      // Sets the user session value
      req.session.user = id;
      response.success(res);
    }
    else
    {
      response.error(res);
    }
  }
  catch(err)
  {
    response.error(res, err);
  }
}