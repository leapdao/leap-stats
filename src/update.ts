'use strict';

import * as uuid from 'uuid';
import { bufferToHex } from 'ethereumjs-util'
import { helpers } from 'leap-core';
import Web3 from 'web3';

import dynamoDb from './dynamodb'

export const updateStats = async (_event, _context, callback) => {
  const plasmaProvider = 'wss://testnet-node1.leapdao.org:1443';
  const web3Plasma = helpers.extendWeb3(new Web3(plasmaProvider));

  await web3Plasma.eth.net.getId();

  const uTxos = await web3Plasma.getUnspent();

  let unspents: import('./types').UnspentWithTx[] = await Promise.all(
    uTxos.map(async (u: import('./types').UnspentWithTx) => {
      u.transaction = await web3Plasma.eth.getTransaction(bufferToHex(u.outpoint.hash)) as import('./types').LeapTransaction;
      return u;
    })
  );

  const blockNumbers = [...new Set(unspents.map(u => u.transaction.blockNumber))]; // Removes duplicates
  const blocksWithTimestamps = {};

  await Promise.all(
    blockNumbers.map(async (bn) => {
      const block = await web3Plasma.eth.getBlock(bn);
      blocksWithTimestamps[bn] = block.timestamp;
    })
  );

  unspents = unspents.map(u => {
    u.timestamp = blocksWithTimestamps[u.transaction.blockNumber];
    return u;
  });

  // Filter out last 30 days UTXOs
  const endTimestamp = new Date().getTime() / 1000;
  const startTimestamp = endTimestamp - 30 * 24 * 60 * 60; // 30 days old

  const currentUtxos = unspents.filter(u => u.timestamp >= startTimestamp && u.timestamp <= endTimestamp);

  // Remove same address transactions
  const activeUtxos = currentUtxos.filter(c => c.transaction.from !== c.transaction.to);

  const params = {
    TableName: process.env.STATS_TABLE,
    Item: {
      id: uuid.v1(),
      count: activeUtxos.length,
      createdAt: endTimestamp * 1000
    }
  };

  dynamoDb.put(params, (error, _result) => {
    if (error) {
      console.error(error);
      callback(new Error('Couldn\'t update the stats in the DynamoDB.'));
      return
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

    callback(null, response)
  })
};
