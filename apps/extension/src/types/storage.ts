import type { RequestArguments } from "./request";
import type { ServerResponse } from "./server_response";

export enum StateKind {
  // Waiting for simulation result.
  Pending,

  // Simulation is completed, waiting for user action.
  //
  // It could have failed, or had some sort of error. Either way we have to present this to the user for some action.
  ActionRequired,

  // Completed
  //
  // This could be the user confirmed, or rejected or we just want to skip this popup. Either way, we're at a terminal state.
  Completed
}

/// Shared information kept across the entire state machine.
export type RequestBase = {
  /// Uuid for the request
  id: string;

  /// Hostname where this request originated.
  ///
  /// This is not sent to the server for every request. It is sent when we see
  /// a warning or alert.
  hostname: string;

  /// Request Arguments
  ///
  /// TODO(jqphu): create a helper funciton that gets the signer from the RequestArguments;
  /// This is kept in the base in order to retry requests, check what kind of request this was (so we can dicipher the response).
  request: RequestArguments;

  /// Date of this request.
  date: Date;
};

export type Pending = RequestBase & {
  state: StateKind.Pending;
};

// TODO(jqphu): break this down further in terms of types.
export type ActionRequired = RequestBase & {
  state: StateKind.ActionRequired;

  // Either we got a succesful server response or an error.
  response:
    | {
        success: ServerResponse;
      }
    | {
        error: RequestError;
      };
};

export type RequestError = {
  // The type of error.
  type: RequestErrorType;

  // Optional additional message.
  message: string | null;
};

export enum RequestErrorType {
  // Could not send the request at all.
  NetworkError,

  // Unknown Error
  //
  // Both random errors but also the server responding with error.
  UnknownError
}

export enum Action {
  Resolve,
  Reject
}

export type Completed = RequestBase & {
  state: StateKind.Completed;

  // Did the user continue, or reject this request.
  action: Action;

  // Optional response. This might be the tx hash if confirmed.
  response?: any;
};

export type State = Pending | ActionRequired | Completed;
