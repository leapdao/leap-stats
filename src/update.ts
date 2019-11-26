'use strict';

import * as uuid from 'uuid';
import { bufferToHex } from 'ethereumjs-util'
import { helpers } from 'leap-core';
import Web3 from 'web3';

import { LeapTransaction, UnspentWithTx } from './types';
import dynamoDb from './dynamodb'

export const updateStats = async (_event, _context) => {
  const plasmaProvider = process.env.PLASMA_PROVIDER;
  console.log('Updating stats... ' + plasmaProvider);

  const web3Plasma = helpers.extendWeb3(new Web3(plasmaProvider));

  await web3Plasma.eth.net.getId();

  const uTxos = await web3Plasma.getUnspentAll();

  let unspents = await Promise.all(
    uTxos.map((u: UnspentWithTx) =>
      web3Plasma.eth.getTransaction(bufferToHex(u.outpoint.hash))
        .then((tx: LeapTransaction) => {
          u.transaction = tx;
          return u;
        })
    )
  );

  const blockNumbers = [...new Set(unspents.map(u => u.transaction.blockNumber))]; // Removes duplicates
  const blocksWithTimestamps = {};

  await Promise.all(
    blockNumbers.map(bn =>
      web3Plasma.eth.getBlock(bn).then(block =>
        blocksWithTimestamps[bn] = block.timestamp
      )
    )
  );

  // Filter out last 30 days UTXOs
  const endTimestamp = new Date().getTime() / 1000;
  const startTimestamp = endTimestamp - 30 * 24 * 60 * 60; // 30 days old

  const activeUtxos = unspents.filter(u => {
    const timestamp = blocksWithTimestamps[u.transaction.blockNumber];
    const withinLast30days = timestamp >= startTimestamp && timestamp <= endTimestamp;
    const notFromSelf = u.transaction.from !== u.transaction.to;
    return withinLast30days && notFromSelf;
  });

  console.log('Active UTXOs metric ' + activeUtxos.length);

  const params = {
    TableName: process.env.STATS_TABLE,
    Item: {
      id: uuid.v1(),
      count: activeUtxos.length,
      createdAt: endTimestamp * 1000
    }
  };

  console.log('Saving to DynamoDB...');

  await new Promise((resolve, reject) =>
    dynamoDb.put(params, (err, result) => err ? reject(err) : resolve(result))
  );
  
  console.log('Saved to DynamoDB successfully!');
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
