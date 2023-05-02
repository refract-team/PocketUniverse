/// Requests sent to the injected script.

import type { UnionToIntersection, Values } from "./request-common";
import { RequestReceiver, RequestSender } from "./request-common";

/// Requestes that can be sent to injected script.
type RequestPaths = "health";
interface RequestHandlers {
  health: (name: string) => Promise<string>;
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
export class InjectedReceiver extends RequestReceiver<RequestHandlers> {
  constructor(handlers: RequestHandlers) {
    super("to_injected", handlers);
  }
}

//export class InjectedSender extends RequestSender<RequestHandlers> {
//
//}

// InjectedRequestHandler which will handle all callbacks.
//
// This acts as the **server**.
export class InjectedSender extends RequestSender {
  constructor() {
    super("to_injected");
  }

  // Public type safe requests.
  request: Overloading = async <Path extends RequestPaths>(
    path: Path,
    ...args: Parameters<RequestHandlers[Path]>
  ): Promise<any> => {
    return this.requestNotTypesafe(path, args);
  };
}
