'use strict';

/**
 * Returns a json response with "success" status and custom content
 * @param {Object} res Response object
 * @param {*} data Response content
 */
function success(res, data)
{
  res.json(
    {
      isOk: true,
      content: data
    }
  );
}

/**
 * Returns a json response with "error" status and custom error
 * @param {Object} res Response object
 * @param {*} error Response error
 */
function error(res, error)
{
  res.json(
    {
      isOk: false,
      content: error
    }
  );
}

exports.success = success;
exports.error = error;