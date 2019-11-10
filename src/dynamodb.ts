'use strict';

import { DynamoDB } from 'aws-sdk';

let options = {};

// Connect to local DB if running offline
if (process.env.IS_OFFLINE) {
  options = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
  };
}

const client = new DynamoDB.DocumentClient(options);

export default client;
