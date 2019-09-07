'use strict';

const response = require('../helpers/response');

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