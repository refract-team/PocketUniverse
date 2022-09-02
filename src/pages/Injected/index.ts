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

// Heavily taken from RevokeCash to ensure consistency.
//
// https://github.com/RevokeCash/browser-extension
const sendHandler = {
  apply: (target: any, thisArg: any, args: any[]) => {
    const [payloadOrMethod, callbackOrParams] = args;

    // ethereum.send has three overloads:

    // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;
    // > gets handled like ethereum.request
    if (typeof payloadOrMethod === 'string') {
      return window.ethereum.request({
        method: payloadOrMethod,
        params: callbackOrParams,
      });
    }

    // ethereum.send(payload: JsonRpcRequest): unknown;
    // > cannot contain signature requests
    if (!callbackOrParams) {
      return Reflect.apply(target, thisArg, args);
    }

    // ethereum.send(payload: JsonRpcRequest, callback: JsonRpcCallback): void;
    // > gets handled like ethereum.sendAsync
    return window.ethereum.sendAsync(payloadOrMethod, callbackOrParams);
  },
};

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

const sendAsyncHandler = {
  apply: async (target: any, thisArg: any, args: any[]) => {
    /*
     * User has disabled PU, just reflect.
     */
    if (settings.disable) {
      return Reflect.apply(target, thisArg, args);
    }

    const [request, callback] = args;
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
    if (request.method === 'eth_sendTransaction') {
      log.info('Transaction Request');

      if (request.params.length !== 1) {
        // Forward the request anyway.
        log.warn('Unexpected argument length.');
        return Reflect.apply(target, thisArg, args);
      }

      log.info(request, 'Request being sent');
      target({ method: 'eth_chainId' })
        .then((chainId: any) =>
          REQUEST_MANAGER.request({
            chainId,
            transaction: request.params[0],
          })
        )
        .then((response: any) => {
          if (response === Response.Reject) {
            log.info('Reject');
            // Based on EIP-1103
            // eslint-disable-next-line no-throw-literal
            const error = ethErrors.provider.userRejectedRequest(
              'PocketUniverse Tx Signature: User denied transaction signature.'
            );
            const response = {
              id: request?.id,
              jsonrpc: '2.0',
              error,
            };
            callback(error, response);
            // For error, we just continue, to make sure we don't block the user!
          } else if (
            response === Response.Continue ||
            response === Response.Error
          ) {
            log.info(response, 'Continue | Error');
            return Reflect.apply(target, thisArg, args);
          }
        });
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

      target({ method: 'eth_chainId' })
        .then((chainId: any) =>
          REQUEST_MANAGER.request({
            chainId,
            domain: params['domain'],
            message: params['message'],
            primaryType: params['primaryType'],
          })
        )
        .then((response: any) => {
          if (response === Response.Reject) {
            log.info('Reject');
            // Based on EIP-1103
            // eslint-disable-next-line no-throw-literal
            const error = ethErrors.provider.userRejectedRequest(
              'PocketUniverse Message Signature: User denied message signature.'
            );
            const response = {
              id: request?.id,
              jsonrpc: '2.0',
              error,
            };
            callback(error, response);
            // For error, we just continue, to make sure we don't block the user!
          } else if (
            response === Response.Continue ||
            response === Response.Error
          ) {
            log.info(response, 'Continue | Error');
            return Reflect.apply(target, thisArg, args);
          }
        });
    }
  },
};

const addProxy = () => {
  log.debug('Added proxy');
  window.ethereum.request = new Proxy(window.ethereum.request, requestHandler);
  window.ethereum.send = new Proxy(window.ethereum.send, sendHandler);
  window.ethereum.sendAsync = new Proxy(
    window.ethereum.sendAsync,
    sendAsyncHandler
  );

  window.removeEventListener('ethereum#initialized', addProxy);
};

if (window.ethereum) {
  log.debug({ provider: window.ethereum }, 'Detected Provider');
  addProxy();
} else {
  log.debug('Adding event listener');
  window.addEventListener('ethereum#initialized', addProxy, { once: true });
}
