'use strict';

const response = require('../helpers/response');
const User = require('../models/user');

exports.signup = async function(req, res)
{
  try
  {
    let username = escape(req.body.username);
    let password = escape(req.body.password);

    await User.create(username, password);

    response.success(res);
  }
  catch(err)
  {
    response.error(res, err);
  }
}

exports.login = async function(req, res)
{
  try
  {
    let username = escape(req.body.username);
    let password = escape(req.body.password);

    let user = await User.authenticate(username, password);

    req.session.user = user._id;

    response.success(res, user);
  }
  catch(err)
  {
    response.error(res, err);
  }
}

exports.validate = async function(req, res)
{
  try
  {
    let id = req.body.id;
    let hash = req.body.hash;

    if(await User.validate(id, hash))
    {
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