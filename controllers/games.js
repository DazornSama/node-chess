'use strict';

// Modules import
const response = require('../helpers/response');
const History = require('../models/history');
const User = require('../models/user');

/**
 * Handler for "/user/games/stats" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.stats = async function(req, res)
{
  try
  {
    let userTag = req.params.userTag;
    let stats = await History.countUserGame('#' + userTag);
    stats.points = await User.getPoints('#' + userTag);

    response.success(res, stats);
  }
  catch(err)
  {
    response.error(res, err);
  }
}

/**
 * Handler for "/users/top100" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.top100 = async function(req, res)
{
  try
  {
    let ranking = await User.getTop100();

    response.success(res, ranking);
  }
  catch(err)
  {
    response.error(res, err);
  }
}