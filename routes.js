'use strict';

const controllers = require('./controllers');

module.exports = function(app)
{
  app.route('/')
    .get(controllers.views.index);

  app.route('/auth/signup')
    .post(controllers.auth.signup);

  app.route('/auth/login')
    .post(controllers.auth.login);

  app.route('/auth/validate')
    .post(controllers.auth.validate);
}