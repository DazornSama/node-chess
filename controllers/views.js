'use strict';

const path = require('path');

exports.index = function(req, res)
{
  let viewName = 'index';

  console.log(req.session.user);
  if(!req.session.user)
  {
    viewName = 'auth';
  }

  res.render(path.join(__dirname + '/../views/' + viewName + '.ejs'));
}