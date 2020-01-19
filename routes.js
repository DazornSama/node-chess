'use strict';

// Controllers object import
const controllers = require('./controllers');

/**
 * Defines website routing
 * @param {Express.Application} app Express application object
 */
function routing(app) {
  // GET requests
  app.route('/')
    .get(controllers.views.index);

  app.route('/logout')
    .get(controllers.views.logout);

  app.route('/lang')
    .get(controllers.lang.get);

  app.route('/user/:userTag/games/stats')
    .get(controllers.games.stats);

  app.route('/users/top100')
    .get(controllers.games.top100);

  // POST requests
  app.route('/auth/signup')
    .post(controllers.auth.signup);

  app.route('/auth/login')
    .post(controllers.auth.login);

  app.route('/auth/validate')
    .post(controllers.auth.validate);

  app.route('/auth/google/:idToken')
    .post(controllers.auth.googleSignIn);
};

// Exposes module as a method
module.exports = routing;