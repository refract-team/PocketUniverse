/// We use storage to synchronize state across background, tab and content script.
///
/// Unforuntately, this is NOT thread safe. We could accidentally override
/// state. This could happen if say we're getting a transaction and accepting one
/// at the same time.
///
/// This is very rare as we mostly handle 1 transaction at a time and do so
/// synchronously. Even if we get many transactions, the worst case is they have
/// to reject/continue and retry the simulation.
///
/// To correctly handle this we probably want the background page to be the
/// only one mutating state. That is, forward all requests to the background
/// page.

import { ethErrors } from "eth-rpc-errors";
import { v4 as uuidv4 } from "uuid";

import type { ActionRequired, Completed, Pending, RequestError, State } from "~types";
import { Action, StateKind } from "~types";
import type { ServerResponse } from "~types";
import { logStorage as log } from "~utils/log";

import { extensionStore, storeName } from "./extension-store";

// We only store a single request at a time.
export const REQUEST_STORE_NAME = storeName("request");

/// All of these should be set by this file, the user shouldn't need to provide it.
type IgnoredTypes = "id" | "date" | "state";

// Get all the requests, returningi empty array if there are none.
// TODO(jqphu): this doesn't seem to typecheck null.
export const getRequest = async () => extensionStore.get<State | null>(REQUEST_STORE_NAME);
export const setRequest = async (state: State | null) =>
  extensionStore.set(REQUEST_STORE_NAME, state);

// Clear Request with the given id.
export const clearRequest = async (id: string) => {
  const currentRequest = await getRequest();
  if (currentRequest?.id == id) {
    setRequest(null);
  }
};

/// Create a pending request in storage.
export const createPendingRequest = async (pending: Omit<Pending, IgnoredTypes>) => {
  const request: Pending = {
    state: StateKind.Pending,
    id: uuidv4(),
    date: new Date(),
    ...pending
  };

  const currentRequest: State = await getRequest();

  if (currentRequest) {
    log.info(
      `Request already exists, completing old with error: ${JSON.stringify(
        currentRequest,
        null,
        2
      )} new: ${JSON.stringify(request, null, 2)}`
    );

    await setAction(
      currentRequest.id,
      Action.Reject,
      // Based on EIP-1103
      ethErrors.provider.userRejectedRequest(
        "PocketUniverse Tx Signature: User denied transaction signature."
      )
    );
  }

  log.debug(`Request: ${JSON.stringify(request, null, 2)}`);

  await setRequest(request);

  return request.id;
};

export const completePendingRequest = async (response: ServerResponse) => {
  const request = await getRequest();

  if (!request) {
    log.info(
      `Request with id could not be found for response ${JSON.stringify(response, null, 2)}`
    );
  } else if (request.id != response.id) {
    // This is likely meaning the request is stale.
    log.info(`Invalid request id. Found ${request.id} but response is for ${response.id}`);
  } else if (request.state != StateKind.Pending) {
    // Request matches but we've already completed it.
    log.warn(`Already completed`);
  } else {
    const actionRequired: ActionRequired = {
      // Fill in the base data.
      ...request,
      state: StateKind.ActionRequired,
      response: {
        success: response
      }
    };

    await setRequest(actionRequired);
  }
};

export const errorPendingRequest = async (id: string, error: RequestError) => {
  const request = await getRequest();

  if (!request) {
    log.info(`Request does not exist to error ${id}`);
  } else if (request.id != id) {
    // This is likely meaning the request is stale.
    log.info(`Invalid request id. Found ${request.id} but response is for ${id}`);
  } else {
    const actionRequired: ActionRequired = {
      // Fill in the base data.
      ...request,
      state: StateKind.ActionRequired,
      response: {
        error
      }
    };

    await setRequest(actionRequired);
  }
};

export const setAction = async (id: string, action: Action, response?: any) => {
  const request = await getRequest();

  if (!request) {
    log.warn(`Unknown request, skipping`);

    return;
  }

  log.info(`Setting ${id} to ${action}`);

  // Set the action regardless.
  const completedRequest = {
    ...request,
    state: StateKind.Completed,
    action,
    response
  } as Completed;

  log.info(`Request ${id} ${JSON.stringify(completedRequest, null, 2)}`);

  await setRequest(completedRequest);
};

/// Reject a pending request
///
/// This is used if the user closes the popup.
export const tryRejectPendingRequest = async () => {
  const request = await getRequest();

  if (!request) {
    return;
  }

  // Only if we closed but there was an action to still be taken.
  if (request.state == StateKind.ActionRequired) {
    // Set the action regardless.
    const rejectedRequest = {
      ...request,
      state: StateKind.Completed,
      action: Action.Reject,
      response: ethErrors.provider.userRejectedRequest("PocketUniverse: User denied request.")
    } as Completed;

    await setRequest(rejectedRequest);
  }
};
