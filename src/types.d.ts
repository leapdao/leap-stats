import { Unspent } from 'leap-core';
import { Transaction } from 'web3-core';

export interface LeapTransaction extends Transaction {
  raw: string;
  color: number;
}

export type UnspentWithTx = Unspent & {
  transaction: LeapTransaction;
  pendingFastExit?: boolean;
  timestamp: string | number;
};
