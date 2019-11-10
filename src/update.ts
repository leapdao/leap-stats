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

  const unspents: import('./types').UnspentWithTx[] = await Promise.all(
    uTxos.map((u: import('./types').UnspentWithTx) =>
      web3Plasma.eth
        .getTransaction(bufferToHex(u.outpoint.hash))
        .then((tx: import('./types').LeapTransaction) => {
          u.transaction = tx;
          return u;
        })
        .then((uTx: import('./types').UnspentWithTx) =>
          web3Plasma.eth
            .getBlock(uTx.transaction.blockNumber)
            .then((b: import('web3-eth').Block) => {
              uTx.timestamp = b.timestamp;
              return uTx;
            })
        )
    )
  );

  // Filter current month UTXOs
  const endTimestamp = new Date().getTime() / 1000;
  const startTimestamp = endTimestamp - 30 * 24 * 60 * 60; // 30 days from now

  const currentUtxos = unspents.filter(u => u.timestamp >= startTimestamp && u.timestamp <= endTimestamp);

  // Filter same address transactions
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
