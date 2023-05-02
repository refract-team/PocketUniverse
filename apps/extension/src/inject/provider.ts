import { logInjected as log } from "~utils/log";

declare global {
  interface Window {
    ethereum?: any;
    refract: any;
  }
}

log.debug("Starting provider script");

const addPocketUniverseProxy = (provider: any) => {
  if (!provider || provider.isPocketUniverse) {
    return;
  }

  // Heavily taken from RevokeCash to ensure consistency. Thanks Rosco :)!
  //
  // https://github.com/RevokeCash/browser-extension
  const sendHandler = {
    apply: (target: any, thisArg: any, args: any[]) => {
      const [payloadOrMethod, callbackOrParams] = args;

      // ethereum.send has three overloads:

      // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;
      // > gets handled like ethereum.request
      if (typeof payloadOrMethod === "string") {
        return provider.request({
          method: payloadOrMethod,
          params: callbackOrParams
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
    }
  };

  const requestHandler = {
    apply: async (target: any, thisArg: any, args: any[]) => {
      const [request] = args;
      if (!request) {
        return Reflect.apply(target, thisArg, args);
      }

      if (
        request.method !== "eth_signTypedData_v3" &&
        request.method !== "eth_signTypedData_v4" &&
        request.method !== "eth_sendTransaction" &&
        request.method !== "eth_sign" &&
        request.method !== "personal_sign"
      ) {
        return Reflect.apply(target, thisArg, args);
      }

      const accounts = await provider.request({ method: "eth_accounts" });
      const chainId = await provider.request({ method: "eth_chainId" });

      // This will throw for any errors including reject.
      await window.refract.contentSender.request("simulateRequest", {
        chainId,
        signer: accounts[0],
        method: request.method,
        params: request.params,
        options: {
          websocket: false,
        }
      });

      return Reflect.apply(target, thisArg, args);
    }
  };

  const sendAsyncHandler = {
    apply: async (target: any, thisArg: any, args: any[]) => {
      const [request, callback] = args;
      if (!request) {
        return Reflect.apply(target, thisArg, args);
      }

      if (
        request.method !== "eth_signTypedData_v3" &&
        request.method !== "eth_signTypedData_v4" &&
        request.method !== "eth_sendTransaction" &&
        request.method !== "eth_sign" &&
        request.method !== "personal_sign"
      ) {
        return Reflect.apply(target, thisArg, args);
      }

      const { method, params, ...rest } = request;
      provider
        .request({ method, params })
        .then((result: any) => callback(null, { ...rest, method, result }))
        .catch((error: any) => callback(error, { ...rest, method, error }));
    }
  };

  log.debug("Added proxy");
  // TODO(jqphu): Brave will not allow us to overwrite request/send/sendAsync as it is readonly.
  //
  // The workaround would be to proxy the entire window.ethereum object (but
  // that could run into its own complications). For now we shall just skip
  // brave wallet.
  //
  // This should still work for metamask and other wallets using the brave browser.
  try {
    Object.defineProperty(provider, "request", {
      value: new Proxy(provider.request, requestHandler)
    });
    Object.defineProperty(provider, "send", {
      value: new Proxy(provider.send, sendHandler)
    });
    Object.defineProperty(provider, "sendAsync", {
      value: new Proxy(provider.sendAsync, sendAsyncHandler)
    });
    provider.isPocketUniverse = true;
    console.log("Pocket Universe is running!");
  } catch (error) {
    // If we can't add ourselves to this provider, don't mess with other providers.
    log.warn(
      "Could not attach to provider ${JSON.stringify(provider, null, 2)} ${JSON.stringify(error, null, 2)}"
    );
  }
};

const addProxy = (provider: any) => {
  // Protect against double initialization.
  if (provider && !provider?.isPocketUniverse) {
    log.debug("Injecting");

    addPocketUniverseProxy(provider);

    if (provider.providers?.length) {
      log.debug("New providers!");
      provider.providers.forEach(addPocketUniverseProxy);
    }
  }
};

const addProxyEthereum = () => {
  addProxy(window.ethereum);
};

let ethCached: any = undefined;

// Edge MetaMask injects first, we need to wrap it. This doesn't cause
// issues with Phantom because phantom doesn't define isMetaMask until the
// webpage loads.
if (window.ethereum && window.ethereum.isMetaMask) {
  console.log("Pocket Univerese: window.ethereum found, attaching");
  ethCached = window.ethereum;
  addProxy(ethCached);
} else {
  console.log("Pocket Univerese: window.ethereum not found, attempting to define");
}

try {
  Object.defineProperty(window, "ethereum", {
    get: () => {
      return ethCached;
    },
    set: (provider: any) => {
      addProxy(provider);
      ethCached = provider;
    },
    configurable: false
  });
} catch (e) {
  // Another wallet could have already defined the property widnow.ethereum
  //
  // In these scenarios, we still rely on our injection below..
  console.log("Failed to define property", e);
}

// Periodically check if we've injected into all wallets.
const timer = setInterval(addProxyEthereum, 100);

// This cleanup timeout serves two purposes.
//
// 1. There is a wallet
//
// We do not clear the timeout in addProxyEthereum since if coinbase wallet and
// metamask are both present, metamask will augment the providers array. We do
// not get any events when this happens. Thus, we continually poll to see if
// there are any new providers and if there are we inject ourselves.
//
// 2. There are no wallets at all.
//
// Although we don't do a lot of work, we don't want to churn CPU cycles for no
// reason. Thus after 5 seconds we give up on checking for the wallet.
setTimeout(() => {
  clearTimeout(timer);
}, 5000);
