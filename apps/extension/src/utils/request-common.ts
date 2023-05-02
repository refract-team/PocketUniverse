import { v4 as uuidv4 } from "uuid";

import { Action } from "~types";
import { logRequestManager as log } from "~utils/log";

// Shared arguments for a given requets.
type Request = {
  // uuid for this request
  id: string;

  // ChannelName that the request came from (reply to this channelName)
  channelName: ChannelName;
};

type DispatchRequest = Request & {
  // Path
  path: string;

  // Args
  args: any;
};

type DispatchResponse = Request & {
  // Path
  path: string;

  // Whether we reject or resolve.
  action: Action;

  // Response, this could be an error.
  response?: any;
};

/// Who is handling the requetss.
///
/// to_injected means we're sending a request to the injected script to handle the request.
/// to_content means we're sending a request to the content script to handle the request.
type ChannelName = "to_injected" | "to_content";
const requestListenerName = (channelName: ChannelName) =>
  `POCKET_UNIVERSE_DISPATCH_REQUEST-${channelName}`;
const responseListenerName = (channelName: ChannelName) =>
  `POCKET_UNIVERSE_DISPATCH_RESPONSE-${channelName}`;

/// Listener aka server for requests.
export class RequestReceiver<RequestHandlers> {
  // Name of the handler we're listening as.
  #channelName: ChannelName;

  // How to handle these requets.
  #handlers: RequestHandlers;

  constructor(channelName: ChannelName, handlers: RequestHandlers) {
    this.#channelName = channelName;
    this.#handlers = handlers;

    // Listen to incoming requests.
    //
    // That are targetting this channelName.
    document.addEventListener(requestListenerName(this.#channelName), async (event: any) => {
      this.#handleRequest(JSON.parse(event.detail));
    });
  }

  // Handle an incoming request.
  //
  // # Security
  //
  // All requests can be invalid and manipulated. We're at the website level
  // here so anything can change. Worst case it will crash things, we treat
  // everything as invalid input from the tab script not here.
  #handleRequest = async (request: DispatchRequest) => {
    log.info(
      `[${this.#channelName}] Incoming Request to ${request.path} with args: ${JSON.stringify(
        request.args,
        null,
        2
      )}`
    );

    // Forward the handler
    try {
      const response = await this.#handlers[request.path].apply(this, request.args);
      this.#dispatchResponse({
        id: request.id,
        channelName: request.channelName,
        path: request.path,
        action: Action.Resolve,
        response
      });
    } catch (e) {
      this.#dispatchResponse({
        id: request.id,
        channelName: request.channelName,
        path: request.path,
        action: Action.Reject,
        response: e
      });
    }
  };

  #dispatchResponse = (response: DispatchResponse) => {
    document.dispatchEvent(
      new CustomEvent(responseListenerName(response.channelName), {
        detail: JSON.stringify(response)
      })
    );
  };
}

type Callback = { resolve: (value: unknown) => void; reject: (reason?: any) => void };

/// RequestSender who will send requests to the given channel.
export class RequestSender {
  #channelName: ChannelName;

  /// List of all the requests that are in flight.
  ///
  /// Map from UUID to a callback to be called when the data is returned.
  #pendingRequests: Map<string, Callback> = new Map();

  constructor(channelName: ChannelName) {
    this.#channelName = channelName;

    // Listen to incoming responses for this channel.
    //
    // Responses that are targetting this channelName.
    document.addEventListener(responseListenerName(this.#channelName), (event: any) => {
      this.#handleResponse(JSON.parse(event.detail));
    });

    log.info(`Creating request sender ${this.#channelName}`);
  }

  /// Private non type safe request.
  ///
  /// This should be wrapped in a type safe requester.
  protected requestNotTypesafe = async (path: string, args: any): Promise<any> => {
    log.info(`[${this.#channelName}] Request ${path} with args: ${JSON.stringify(args, null, 2)}`);

    return new Promise((resolve, reject) => {
      const id = uuidv4();

      this.#pendingRequests.set(id, {
        resolve,
        reject
      });

      const request: DispatchRequest = {
        id,
        channelName: this.#channelName,
        path,
        args
      };

      this.#dispatchRequest(request);
    });
  };

  #dispatchRequest = (request: DispatchRequest) => {
    document.dispatchEvent(
      new CustomEvent(requestListenerName(request.channelName), {
        detail: JSON.stringify(request)
      })
    );
  };

  // Handle an incoming response to an already existing request.
  #handleResponse = (response: DispatchResponse) => {
    log.info(
      `[${this.#channelName}] Incoming Response to ${response.path} with args: ${JSON.stringify(
        response,
        null,
        2
      )}`
    );

    const pendingRequest = this.#pendingRequests.get(response.id);
    if (!pendingRequest) {
      log.info("Could not find request with id: ${response.id}");
      // Could be a stale request.
      return;
    }

    if (response.action === Action.Resolve) {
      // Unwrap the response, drop the id.
      pendingRequest.resolve(response.response);
    } else {
      pendingRequest.reject(response.response);
    }

    // Remove it from the mapping.
    this.#pendingRequests.delete(response.id);
  };
}

// credits goes to https://stackoverflow.com/a/50375286
// function intersection produces - function overloads
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type Values<T> = T[keyof T];
