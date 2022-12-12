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

export type SimulateRequestArgs = {
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
};

export type SignatureRequestArgs = {
  /**
   * UUID for this request.
   */
  id: string;

  /**
   * Chain ID for this request in hex.
   */
  chainId: string;

  /**
   * Domain for this signature request.
   */
  domain: any;

  /**
   * Message to be signed for this signature request.
   */
  message: any;

  /**
   * Primary type for this message.
   */
  primaryType: string;
};

export type SignatureHashSignArgs = {
  /**
   * UUID for this request.
   */
  id: string;

  /**
   * Chain ID for this request in hex.
   */
  chainId: string;

  /**
   * Hash being signed.
   */
  hash: string;
};

export type RequestArgs =
  | SimulateRequestArgs
  | SignatureRequestArgs
  | SignatureHashSignArgs;

/**
 * Command to simulate request between content script and service worker.
 */
export const REQUEST_COMMAND = 'request';

/**
 * Phishing link check command.
 */
export const PHISHING_REQUEST_COMMAND = 'phishing-request';

/**
 * Phishing link response command.
 */
export const PHISHING_RESPONSE_COMMAND = 'phishing-response';

/**
 * Map request to replies.
 *
 * This is stored in memory, after the page shuts down this is gone.
 */
export class RequestManager {
  /**
   * Maps from a uuid to a resolver function which takes a response.
   */
  mappings: Map<string, (args: Response) => void> = new Map();

  constructor() {
    this.mappings = new Map();

    document.addEventListener(DISPATCH_RESPONSE, (event: any) => {
      this._handleResponse(JSON.parse(event.detail));
    });
  }

  /**
   * Add a request and store it in the request manager.
   */
  public request(
    args:
      | {
          chainId: string;
          transaction: Transaction;
        }
      | {
          chainId: string;
          domain: any;
          message: any;
          primaryType: string;
        }
      | {
          chainId: string;
          hash: string;
        }
  ): Promise<Response> {
    return new Promise((resolve) => {
      let request: RequestArgs;
      const id = uuidv4();
      const chainId = args.chainId;

      if ('transaction' in args) {
        request = {
          id,
          chainId,
          transaction: args.transaction,
        };
      } else if ('hash' in args) {
        request = {
          id,
          chainId,
          hash: args.hash,
        };
      } else {
        request = {
          id,
          chainId,
          domain: args.domain,
          message: args.message,
          primaryType: args.primaryType,
        };
      }
      this.mappings.set(id, resolve);

      this._dispatchRequest(request);
    });
  }

  /**
   * Dispatch a request.
   */
  private _dispatchRequest = (request: RequestArgs) => {
    document.dispatchEvent(
      new CustomEvent(DISPATCH_REQUEST, {
        detail: request,
      })
    );
  };

  private _handleResponse = (response: ResponseWrapped) => {
    const resolver = this.mappings.get(response.id);
    if (!resolver) {
      // Could be a stale request or for another webpage.
      return;
    }

    // Unwrap the response, drop the id.
    resolver(response.type);

    // Remove it from the mapping.
    this.mappings.delete(response.id);
  };
}

/**
 * Dispatch from injected script to content script.
 */
const DISPATCH_REQUEST = 'POCKET_UNIVERSE_DISPATCH_REQUEST';

/**
 * Listen to request
 */
export const listenToRequest = (callback: (request: RequestArgs) => void) => {
  document.addEventListener(DISPATCH_REQUEST, async (event: any) => {
    callback(event.detail);
  });
};

/**
 * Response.
 */
export enum Response {
  Reject,
  Continue,
  Error,
}

/**
 * Response with id wrapped.
 */
interface ResponseWrapped {
  id: string;
  type: Response;
}

/**
 * Dispatch from content script to injected script
 */
const DISPATCH_RESPONSE = 'POCKET_UNIVERSE_DISPATCH_RESPONSE';

export const dispatchResponse = (response: ResponseWrapped) => {
  document.dispatchEvent(
    new CustomEvent(DISPATCH_RESPONSE, {
      detail: JSON.stringify(response),
    })
  );
};
