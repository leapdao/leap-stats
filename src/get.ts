'use strict';

import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';

import dynamoDb from './dynamodb'

export const getStats: APIGatewayProxyHandler = (_event, _context, callback) => {
  const params = {
    TableName: process.env.STATS_TABLE,
    ScanIndexForward: "false",
    Limit: 1
  };

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the count.',
      });
      return;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        count: result.Items[0] ? result.Items[0].count : 0
      }, null, 2),
    };
    callback(null, response);
  });
};
