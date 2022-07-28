import config from '../config';

import logger from './logger';
import type { Transaction } from './simulate_request_reply';
import { PocketSimulator, Response } from 'pocket-universe-js';

const log = logger.child({ component: 'Server' });

// Will change depending on if dev or not.
const SERVER_URL = config.server;

const pocket = new PocketSimulator(SERVER_URL);

log.info(SERVER_URL, 'SERVER_URL');

export const fetchSimulate = async (args: {
  chainId: string;
  transaction: Transaction;
}): Promise<Response> => {
  log.info(args, 'Fetch simulate');
  return pocket.simulate({
    chainId: args.chainId,
    ...args.transaction,
  });
};
