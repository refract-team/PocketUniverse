import config from '../config';

import logger from './logger';
import type { Transaction } from './request';
import { Response, ResponseType, Simulation } from './models';

const log = logger.child({ component: 'Server' });

// Will change depending on if dev or not.
const SERVER_URL = config.server;

log.info(SERVER_URL, 'SERVER_URL');

export const fetchSimulate = async (args: {
  chainId: string;
  transaction: Transaction;
}): Promise<Response> => {
  log.info(args, 'Fetch simulate');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fetch(`${SERVER_URL}/simulate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    if (result.status === 200) {
      const data = await result.json();

      if (data.success) {
        return {
          type: ResponseType.Success,
          simulation: Simulation.fromJSON(data.simulation),
        };
      }
      return {
        type: ResponseType.Revert,
        error: data.error,
      };
    }

    const { error } = await result.json();
    return { type: ResponseType.Error, error };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log('ERROR: ', e);
    return { error: e.message, type: ResponseType.Error };
  }
};

export const fetchSignature = async (args: {
  domain: any;
  message: any;
}): Promise<Response> => {
  log.info(args, 'Fetch signature');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fetch(`${SERVER_URL}/signature`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    if (result.status === 200) {
      const data = await result.json();

      if (data.success) {
        return {
          type: ResponseType.Success,
          simulation: Simulation.fromJSON(data.simulation),
        };
      }

      return {
        type: ResponseType.Revert,
        error: data.error,
      };
    }

    const { error } = await result.json();
    return { type: ResponseType.Error, error };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log('ERROR: ', e);
    return { error: e.message, type: ResponseType.Error };
  }
};
