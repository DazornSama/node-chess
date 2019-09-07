'use strict';

const path = require('path');
const User = require('../models/user');

exports.index = async function(req, res)
{
  let viewName = 'auth';
  let user;

  if(req.session.user)
  {
    viewName = 'index';
    user = await User.getById(req.session.user);
  }
  
  res.render(path.join(__dirname + '/../views/' + viewName + '.ejs'), { user: user });
}

exports.logout = async function(req, res)
{
  req.session.destroy();
  res.render(path.join(__dirname + '/../views/logout.ejs'), { user: undefined });
}