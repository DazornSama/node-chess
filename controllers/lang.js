'use strict';

// Modules import
const response = require('../helpers/response');

/**
 * Handler for "/lang" request path
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.get = async function(req, res)
{
  try
  {
    response.success(res, req.i18n_texts);
  }
  catch(err)
  {
    response.error(res, err);
  }
}