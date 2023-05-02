/// We intercept websocket messages to support wallet connect.
///
/// It is important that we only intercept walletconnect messages and any failures still cause the app to work correctly.
import { logInjected as log } from "~utils/log";
import * as isoCrypto from "@walletconnect/iso-crypto";
import * as encoding from "@walletconnect/encoding";
import { ServerRpcMethods } from "~types";

log.debug("Starting websocket script");

declare global {
  interface Window {
    refract: any;
  }
}

/// Get the storage key from walletconnect
///
/// By default the storage key will be walletconnect but in theory this could change to a different key.
/// In the instances where we fail, we just forward the request as expected and don't popup.
function loadStorage() {
  try {
    return JSON.parse(window.localStorage.getItem("walletconnect") || "");
  } catch {
    return {};
  }
}

function sendMessage(handler: any, data: any) {
  log.debug(`Sending message to handler ${handler} data: ${JSON.stringify(data, null, 2)}`);
  if(typeof handler == "function") {
    handler(
        new MessageEvent("message", {
          data: data,
        })
      )
  } else {
    handler.handleEvent(
      new MessageEvent("message", {
        data
      })
    );
  }
}

// Create a new WebSocket class that logs every message
class ProxyWebSocket extends WebSocket {
  /// A copy of all the listners for a message.
  ///
  /// We'll use this to broadcast the rejection to.
  listeners: any[] = [];

  /// OnMessage listener.
  ///
  /// We use a separate field since it should override assignments.
  onmessageListener: any;

  async send(msg: any) {
    // If it's not wallet connect, just return.
    if (!this.url.includes("walletconnect") && !this.url.includes("version=1")) {
      super.send(msg);
      return;
    }

    // Any failures, we should just continue with the send.
    try {
      const storage = loadStorage();
      const { key, clientId, chainId, accounts } = storage;

      // Not logged in, not a message we're interested in.
      if (!key || !clientId || !chainId || !accounts) {
        log.debug(`Not logged in yet`);
        super.send(msg);
        return;
      }

      log.debug(`Processing message ${JSON.stringify(msg, null, 2)}`);

      let parsedMsg = JSON.parse(msg);

      // Does not contain a payload, this is uninteresting to us.
      if (parsedMsg.payload?.length === undefined || parsedMsg.payload.length == 0) {
        log.debug(`No Payload`);
        super.send(msg);
        return;
      }

      let payload = JSON.parse(parsedMsg.payload);
      log.debug(`Parsed payload ${JSON.stringify(payload, null, 2)}`);

      // Decrypt payload using the symettric key.
      const result = await isoCrypto.decrypt(payload, encoding.hexToArray(key));

      if (!("id" in result && "method" in result && "params" in result)) {
        log.debug(`Not a RPC Request`);
        super.send(msg);
        return;
      }

      const { id, method, params } = result;

      // Check if it's one of the requests we should simulate
      const methodFound = ServerRpcMethods.safeParse(method);
      if (!methodFound || !methodFound.success) {
        log.debug(`Not a matching method ${method}`);
        super.send(msg);
        return;
      }

      try {
        // Send a request.
        await window.refract.contentSender.request("simulateRequest", {
          // Conver to number, then turn it to hex.
          chainId: `0x${(+chainId).toString(16)}`,
          signer: accounts[0],
          method,
          params,
          options: {
            websocket: true,
          }
        });

        // User pressed continue, just send the transaction.
        super.send(msg);
      } catch {
        log.debug(`Rejected in Pocket Universe`);
        const payload = {
          id: id,
          jsonrpc: "2.0",
          error: { code: -32000, message: "Rejected in Pocket Universe" }
        };

        const encryptedPayload = await isoCrypto.encrypt(payload, encoding.hexToArray(key));

        const data = JSON.stringify({
          payload: JSON.stringify(encryptedPayload),
          topic: clientId,
          type: "pub"
        } );

        if(this.onmessageListener) {
          sendMessage(this.onmessageListener, data);
        }

        this.listeners.forEach((listener) => {
          sendMessage(listener, data);
        })
      }
    } catch (error) {
      log.warn(`Unknown error sending ${error}`);
      super.send(msg);
    }
  }

  removeEventListenr(type: any, listener: any, options: any) {
    // If it's not wallet connect, just return.
    if (!this.url.includes("walletconnect") && !this.url.includes("version=1")) {
      super.removeEventListener(type, listener, options);
      return;
    }

    super.removeEventListener(type, listener, options);

    /// TODO(jqphu): Improve and test removeEventListener callback.
    ///
    /// This should be taking into account options as per-spec.
    if (type === "message") {
      this.listeners = this.listeners.filter((x) => x == listener);
    }
  }

  addEventListener(type: any, listener: any, options: any) {
    // If it's not wallet connect, just return.
    if (!this.url.includes("walletconnect") && !this.url.includes("version=1")) {
      super.addEventListener(type, listener, options);
      return;
    }

    if (type === "message") {
    log.debug(`Adding event listener ${listener}`);
      this.listeners.push(listener);
    }

    super.addEventListener(type, listener, options);
  }

  set onmessage(listener: any) {
    // If it's not wallet connect, just return.
    if (!this.url.includes("walletconnect") && !this.url.includes("version=1")) {
      super.onmessage = listener;
      return;
    }

    log.debug(`Setting onmessage listener ${listener}`);

    // Intentionally override.
    this.onmessageListener = listener;
    super.onmessage = listener;
  }
}

// Replace the WebSocket class with ProxyWebSocket
//
// This is how walletconnect connections are established. Through a websocket transport.
window.WebSocket = ProxyWebSocket;

export {};
