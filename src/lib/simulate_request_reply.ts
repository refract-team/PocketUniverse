/// Simulate request/reply manager for the content script and injected script.
import { v4 as uuidv4 } from 'uuid';

export interface Transaction {
  /**
   * Address we are sending from
   */
  from: string;

  /**
   * Address we are sending to.
   */
  to: string;

  /**
   * Optional data to send.
   */
  data?: string;

  /**
   * Optional value to send.
   */
  value?: string;
}

export interface SimulateRequestArgs {
  /**
   * UUID for this request.
   */
  id: string;

  /**
   * Chain ID for this request in hex.
   */
  chainId: string;

  /**
   * Transaction we want to forward.
   */
  transaction: Transaction;
}

/**
 * Command to simulate request between content script and service worker.
 */
export const SIMULATE_REQUEST_COMMAND = 'simulate';

/**
 * Map request to replies.
 *
 * This is stored in memory, after the page shuts down this is gone.
 */
export class RequestManager {
  /**
   * Maps from a uuid to a resolver function which takes a response.
   */
  mappings: Map<string, (args: SimulateResponse) => void> = new Map();

  constructor() {
    this.mappings = new Map();

    document.addEventListener(DISPATCH_SIMULATE_RESPONSE, (event: any) => {
      this._handleSimulateResponse(event.detail);
    });
  }

  /**
   * Add a request and store it in the request manager.
   */
  public request(args: {
    chainId: string;
    transaction: Transaction;
  }): Promise<SimulateResponse> {
    return new Promise((resolve) => {
      const request = this._createSimulateRequest(args);
      this.mappings.set(request.id, resolve);

      this._dispatchSimulateRequest(request);
    });
  }

  /**
   * Create a simulation request structure.
   */
  private _createSimulateRequest(args: {
    chainId: string;
    transaction: Transaction;
  }): SimulateRequestArgs {
    return {
      id: uuidv4(),
      chainId: args.chainId,
      transaction: args.transaction,
    };
  }

  /**
   * Dispatch a simulate request.
   */
  private _dispatchSimulateRequest = (simulateRequest: SimulateRequestArgs) => {
    document.dispatchEvent(
      new CustomEvent(DISPATCH_SIMULATE_REQUEST, {
        detail: simulateRequest,
      })
    );
  };

  private _handleSimulateResponse = (
    simulateResponse: SimulateResponseWrapped
  ) => {
    const resolver = this.mappings.get(simulateResponse.id);
    if (!resolver) {
      // Could be a stale request or for another webpage.
      return;
    }

    // Unwrap the response, drop the id.
    resolver(simulateResponse.type);

    // Remove it from the mapping.
    this.mappings.delete(simulateResponse.id);
  };
}

/**
 * Dispatch from injected script to content script.
 */
const DISPATCH_SIMULATE_REQUEST = 'POCKET_UNIVERSE_DISPATCH_SIMULATE_REQUEST';

/**
 * Listen to simulate request
 */
export const listenToSimulateRequest = (
  callback: (simulateRequest: SimulateRequestArgs) => void
) => {
  document.addEventListener(DISPATCH_SIMULATE_REQUEST, (event: any) => {
    callback(event.detail);
  });
};

/**
 * Response.
 */
export enum SimulateResponse {
  Reject,
  Continue,
  Error,
}

/**
 * Response with id wrapped.
 */
interface SimulateResponseWrapped {
  id: string;
  type: SimulateResponse;
}

/**
 * Dispatch from content script to injected script
 */
const DISPATCH_SIMULATE_RESPONSE = 'POCKET_UNIVERSE_DISPATCH_SIMULATE_RESPONSE';

export const dispatchSimulateResponse = (response: SimulateResponseWrapped) => {
  document.dispatchEvent(
    new CustomEvent(DISPATCH_SIMULATE_RESPONSE, {
      detail: response,
    })
  );
};
