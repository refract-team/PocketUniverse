import config from '../config';

import logger from './logger';
import type { Transaction } from './request';
import { Response, ResponseType, Simulation } from './models';

const log = logger.child({ component: 'Server' });

// Will change depending on if dev or not.
const SERVER_URL = config.server;

log.info(SERVER_URL, 'SERVER_URL');

export const fetchUpdate = async (args: {
  manifestVersion: string;
}): Promise<{
  message: string;
  link: string;
}> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await fetch(`${SERVER_URL}/v1/updates`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (result.status === 200) {
    const data = await result.json();
    return data;
  } else {
    throw new Error(`Error fetching update message: ${result.status}`);
  }
};

export const fetchSimulate = async (args: {
  id: string;
  signer: string;
  chainId: string;
  transaction: Transaction;
}): Promise<Response> => {
  log.info(args, 'Fetch simulate');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fetch(`${SERVER_URL}/v1/simulate`, {
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

export const fetchSignature = async (
  args: { id: string, chainId: string, signer: string} &
    ({
        domain: any;
        message: any;
      }
    | {
        hash: any;
      }
    | {
      signMessage: string;
    }
    )
): Promise<Response> => {
  log.info(args, 'Fetch signature');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fetch(`${SERVER_URL}/v1/signature`, {
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

    try {
      let { error } = await result.json();
      return { type: ResponseType.Error, error };
    } catch (e) {
      return { type: ResponseType.Error };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log('ERROR: ', e);
    return { error: e.message, type: ResponseType.Error };
  }
};
