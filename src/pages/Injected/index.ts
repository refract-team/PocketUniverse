// PocketUniverse logo in ASCII form.
import logger from '../../lib/logger';
import { RequestManager, Response } from '../../lib/request';
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

let timer: NodeJS.Timer | undefined = undefined;

const addPocketUniverseProxy = (provider: any) => {
  // Heavily taken from RevokeCash to ensure consistency. Thanks Rosco :)!
  //
  // https://github.com/RevokeCash/browser-extension
  const sendHandler = {
    apply: (target: any, thisArg: any, args: any[]) => {
      const [payloadOrMethod, callbackOrParams] = args;

      // ethereum.send has three overloads:

      // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;
      // > gets handled like ethereum.request
      if (typeof payloadOrMethod === 'string') {
        return provider.request({
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
      return provider.sendAsync(payloadOrMethod, callbackOrParams);
    },
  };

  const requestHandler = {
    apply: async (target: any, thisArg: any, args: any[]) => {
      const [request] = args;
      if (!request) {
        return Reflect.apply(target, thisArg, args);
      }

      if (
        request.method !== 'eth_signTypedData_v3' &&
        request.method !== 'eth_signTypedData_v4' &&
        request.method !== 'eth_sendTransaction' &&
        request.method !== 'eth_sign'
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
          chainId: await provider.request({ method: 'eth_chainId' }),
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
          chainId: await provider.request({ method: 'eth_chainId' }),
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
      } else if (request.method === 'eth_sign') {
        log.info('EthSign Request');
        if (request.params.length !== 2) {
          // Forward the request anyway.
          log.warn('Unexpected argument length.');
          return Reflect.apply(target, thisArg, args);
        }

        // Sending response.
        response = await REQUEST_MANAGER.request({
          chainId: await provider.request({ method: 'eth_chainId' }),
          hash: request.params[1],
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
      const [request, callback] = args;
      if (!request) {
        return Reflect.apply(target, thisArg, args);
      }

      if (
        request.method !== 'eth_signTypedData_v3' &&
        request.method !== 'eth_signTypedData_v4' &&
        request.method !== 'eth_sendTransaction' &&
        request.method !== 'eth_sign'
      ) {
        return Reflect.apply(target, thisArg, args);
      }

      log.info({ args }, 'Request Type Async Handler');
      if (request.method === 'eth_sendTransaction') {
        log.info('Transaction Request');

        if (request.params.length !== 1) {
          // Forward the request anyway.
          log.warn('Unexpected argument length.');
          return Reflect.apply(target, thisArg, args);
        }

        log.info(request, 'Request being sent');
        provider
          .request({ method: 'eth_chainId' })
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

        provider
          .request({ method: 'eth_chainId' })
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
      } else if (request.method === 'eth_sign') {
        log.info('EthSign Request');
        if (request.params.length !== 2) {
          // Forward the request anyway.
          log.warn('Unexpected argument length.');
          return Reflect.apply(target, thisArg, args);
        }

        provider
          .request({ method: 'eth_chainId' })
          .then((chainId: any) => {
            REQUEST_MANAGER.request({
              chainId,
              hash: request.params[1],
            });
          })
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

  if (provider && !provider?.isPocketUniverse) {
    log.debug({ provider }, 'Added proxy');
    // TODO(jqphu): Brave will not allow us to overwrite request/send/sendAsync as it is readonly.
    //
    // The workaround would be to proxy the entire window.ethereum object (but
    // that could run into its own complications). For now we shall just skip
    // brave wallet.
    //
    // This should still work for metamask and other wallets using the brave browser.
    try {
      Object.defineProperty(provider, 'request', {
        value: new Proxy(provider.request, requestHandler),
      });
      Object.defineProperty(provider, 'send', {
        value: new Proxy(provider.send, sendHandler),
      });
      Object.defineProperty(provider, 'sendAsync', {
        value: new Proxy(provider.sendAsync, sendAsyncHandler),
      });
      provider.isPocketUniverse = true;
      console.log('Pocket Universe is running!');
    } catch (error) {
      // If we can't add ourselves to this provider, don't mess with other providers.
      log.warn({ provider, error }, 'Could not attach to provider');
    }
  }
};

const addProxy = () => {
  // Protect against double initialization.
  if (window.ethereum && !window.ethereum?.isPocketUniverse) {
    log.debug({ provider: window.ethereum }, 'Injecting!');

    addPocketUniverseProxy(window.ethereum);

    if (window.ethereum.providers?.length) {
      log.debug('New providers!');
      window.ethereum.providers.forEach(addPocketUniverseProxy);
    }
  }
};

if (window.ethereum) {
  log.debug({ provider: window.ethereum }, 'Detected Provider');
  addProxy();
} else {
  log.debug('Adding event listener');
  window.addEventListener('ethereum#initialized', addProxy);
}

timer = setInterval(addProxy, 100);

// This cleanup timeout serves two purposes.
//
// 1. There is a wallet
//
// We do not clear the timeout in addProxy since if coinbase wallet and
// metamask are both present, metamask will augment the providers array. We do
// not get any events when this happens. Thus, we continually poll to see if
// there are any new providers and if there are we inject ourselves.
//
// 2. There are no wallets at all.
//
// Although we don't do a lot of work, we don't want to churn CPU cycles for no
// reason. Thus after 5 seconds we give up on checking for the wallet.
setTimeout(() => {
  window.removeEventListener('ethereum#initialized', addProxy);
  clearTimeout(timer);
}, 5000);
