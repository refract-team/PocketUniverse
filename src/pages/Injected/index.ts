import logger from '../../lib/logger';
import { RequestManager, Response } from '../../lib/request';
import { settings, listenForSettingsUpdates } from '../../lib/settings';
import { ethErrors } from 'eth-rpc-errors';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const log = logger.child({ component: 'Injected' });
log.debug({ msg: 'Injected script loaded.' });

/// Handling all the request communication.
const REQUEST_MANAGER = new RequestManager();
listenForSettingsUpdates();

// Following pattern from revoke-cash
const requestHandler = {
  apply: async (target: any, thisArg: any, args: any[]) => {
    /*
     * User has disabled PU, just reflect.
     */
    if (settings.disable) {
      return Reflect.apply(target, thisArg, args);
    }

    const [request] = args;
    if (!request) {
      return Reflect.apply(target, thisArg, args);
    }

    if (
      request.method !== 'eth_signTypedData_v3' &&
      request.method !== 'eth_signTypedData_v4' &&
      request.method !== 'eth_sendTransaction'
    ) {
      return Reflect.apply(target, thisArg, args);
    }

    log.info({ args }, 'Request type');
    let response;
    if (request.method === 'eth_sendTransaction') {
      log.info('Transaction Request');

      if (request.params.length !== 1) {
        // Forward the request anyway.
        log.warn('Unexpected argument length.');
        return Reflect.apply(target, thisArg, args);
      }

      log.info(request, 'Request being sent');

      // Sending response.
      response = await REQUEST_MANAGER.request({
        chainId: await target({ method: 'eth_chainId' }),
        transaction: request.params[0],
      });

      if (response === Response.Reject) {
        log.info('Reject');
        // Based on EIP-1103
        // eslint-disable-next-line no-throw-literal
        throw ethErrors.provider.userRejectedRequest(
          'PocketUniverse Tx Signature: User denied transaction signature.'
        );
      }
    } else if (
      request.method === 'eth_signTypedData_v3' ||
      request.method === 'eth_signTypedData_v4'
    ) {
      log.info('Signature Request');
      if (request.params.length !== 2) {
        // Forward the request anyway.
        log.warn('Unexpected argument length.');
        return Reflect.apply(target, thisArg, args);
      }

      const params = JSON.parse(request.params[1]);
      log.info({ params }, 'Request being sent');

      // Sending response.
      response = await REQUEST_MANAGER.request({
        chainId: await target({ method: 'eth_chainId' }),
        domain: params['domain'],
        message: params['message'],
        primaryType: params['primaryType'],
      });

      if (response === Response.Reject) {
        log.info('Reject');
        // NOTE: Be cautious when changing this name. 1inch behaves strangely when the error message diverges.
        throw ethErrors.provider.userRejectedRequest(
          'PocketUniverse Message Signature: User denied message signature.'
        );
      }
    } else {
      throw new Error('Show never reach here');
    }

    // For error, we just continue, to make sure we don't block the user!
    if (response === Response.Continue || response === Response.Error) {
      log.info(response, 'Continue | Error');
      return Reflect.apply(target, thisArg, args);
    }
  },
};

const addProxy = () => {
  log.debug('Added proxy');
  window.ethereum.request = new Proxy(window.ethereum.request, requestHandler);

  window.removeEventListener('ethereum#initialized', addProxy);
};

if (window.ethereum) {
  log.debug({ provider: window.ethereum }, 'Detected Provider');
  addProxy();
} else {
  log.debug('Adding event listener');
  window.addEventListener('ethereum#initialized', addProxy, { once: true });
}
