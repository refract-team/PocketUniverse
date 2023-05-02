/// Requests sent to the content script

import type { RequestArguments } from "~types";

import type { UnionToIntersection, Values } from "./request-common";
import { RequestReceiver, RequestSender } from "./request-common";

/// Requestes that can be sent to content script.
type RequestPaths = "reportError" | "simulateRequest";

interface RequestHandlers {
  /// Make an simulate request.
  simulateRequest: (data: RequestArguments) => Promise<any>;

  /// Report a error.
  reportError: (data: { message: string; error?: string }) => Promise<any>;
}

/**
 * Generate all possible combinations of allowed arguments
 *
 * TODO: handle return value types.
 */
type AllOverloads = {
  [Path in RequestPaths]: (path: Path, ...data: Parameters<RequestHandlers[Path]>) => Promise<any>;
};

type Overloading = UnionToIntersection<Values<AllOverloads>>;

/// Receiving requests and handling them..
export class ContentReceiver extends RequestReceiver<RequestHandlers> {
  constructor(handlers: RequestHandlers) {
    super("to_content", handlers);
  }
}

// ContentRequestHandler which will handle all callbacks.
//
// This acts as the **server**.
export class ContentSender extends RequestSender {
  constructor() {
    super("to_content");
  }

  // Public type safe requests.
  request: Overloading = async <Path extends RequestPaths>(
    path: Path,
    ...args: Parameters<RequestHandlers[Path]>
  ): Promise<any> => {
    return this.requestNotTypesafe(path, args);
  };
}
