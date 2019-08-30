'use strict';

function success(res, data)
{
  res.json(
    {
      isOk: true,
      content: data
    }
  );
}

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