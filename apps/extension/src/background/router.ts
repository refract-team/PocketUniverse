import { initTRPC } from "@trpc/server";
import { createChromeHandler } from "trpc-chrome/adapter";
import { z } from "zod";

import * as Sentry from "@sentry/browser";
import { hashRequest } from "~utils/hash";
import {
  completePendingRequest,
  createPendingRequest,
  errorPendingRequest,
  tryRejectPendingRequest,
  clearRequest,
  getRequest
} from "~utils/extension-store";
import { RequestArguments, RequestErrorType, Action, StateKind } from "~types";
import type { ServerResponse } from "~types";
import { logBackground as log } from "~utils/log";

import { request } from "./server";

log.info(`Background Script`);

const t = initTRPC.create({
  isServer: false,
  allowOutsideOfServer: true
});

// The current popup if it's open
let currentPopup = null;

chrome.windows.onRemoved.addListener((windowId: number) => {
  try {
    log.debug("Removing popup.");
    if (currentPopup && currentPopup === windowId) {
      // Try to reject the current pending request.
      tryRejectPendingRequest();
      currentPopup = null;
    }
  } catch (err) {
    Sentry.captureException(err);
    throw err;
  }
});


const createWindow = async () => {
    chrome.windows
      .create({
        url: "tabs/simulate.html",
        type: "popup",
        width: 420,
        height: 760
      }, (createdWindow) => {
        log.debug(createdWindow?.id, "Assigning popup to id");
        currentPopup = createdWindow?.id;
      });
}
const createPopup = async () => {
  if (!currentPopup) {
    log.debug(`Creating a new popup!`);
    await createWindow()
  } else {
    try {
      chrome.windows.update(currentPopup, { focused: true });
    } catch  {
      log.warn(`No window, creating anyway`);
      // Create a window anyway if we fail to update.
      await createWindow();
    }
  }
};

const backgroundRouter = t.router({
  health: t.procedure.input(z.string()).query(({ input }) => `hello ${input} from background`),

  bypassCheck: t.procedure
    .input(
      z.object({
        hostname: z.string(),
        request: RequestArguments
      })
    )
    .mutation(async ({ input }) => {
      try {
        log.info(`Background Bypass Check ${JSON.stringify(input, null, 2)}`);
        const hash = hashRequest(input.request);

        const currentRequest = await getRequest();
        log.info(`Current Request ${JSON.stringify(currentRequest, null, 2)}`);
        if (
          // No pending request, bypass.
          !currentRequest ||
          // Not completed yet, bypass.
          currentRequest.state != StateKind.Completed ||
          // Not resolved (was rejected), bypass.
          currentRequest.action != Action.Resolve ||
          // Request does not match, bypass.
          hashRequest(currentRequest.request) != hash
        ) {
          // Open bypass.
          log.info(
            `BYPASSED ${input.hostname} ${JSON.stringify(input.request, null, 2)} ${hashRequest(
              currentRequest.request
            )} ${hash} action: ${Action.Resolve}`
          );

          // TODO(jqphu): check if should bypass by fetching to server.
          chrome.windows.create({
            url: "tabs/bypass.html",
            type: "popup",
            width: 760,
            height: 760
          });
        } else {
          log.info(`Clearing Request ${JSON.stringify(currentRequest, null, 2)}`);
          // Clear this request to ensure it doesn't get reused e.g. attacker sends two of the same request.
          clearRequest(currentRequest.id);
        }
      } catch (err) {

        // We want to throw the error after reporting it. That way the ContentScript can continue.
        Sentry.captureException(err);
        throw err;
      }
    }),

  /// All ServerRpcRequests which will require a popup.
  request: t.procedure
    .input(
      z.object({
        hostname: z.string(),
        args: RequestArguments
      })
    )
    .mutation(async ({ input }) => {
      const { hostname, args } = input;
      try {
        const id = await createPendingRequest({ hostname, request: args });

        log.info(`Creating request ${JSON.stringify(input, null, 2)} with id ${id}`);

        await createPopup();

        request({ id, chainId: args.chainId }, args)
          .then((response: ServerResponse | { error: boolean, message?: string}) => {
            if(response.error) {
              log.warn(
                `Request[${id}]: errord response from server with optional message '${response.message}'`
              );

              errorPendingRequest(id, {
                message: response.message,
                type: RequestErrorType.UnknownError
              });

            }
            log.info(`Request[${id}]: completed with ${JSON.stringify(response, null, 2)}`);
            completePendingRequest(response);
          })
          .catch((error) => {
            // Capture the error
            Sentry.withScope((scope) => {
              scope.setExtra("input", input);
              Sentry.captureException(error);
            });

            if (error instanceof z.ZodError) {
              log.warn(`[${id}]: parsing errord with data ${JSON.stringify(error, null, 2)}`);
              errorPendingRequest(id, {
                message: `Failed to parse: ${JSON.stringify(error, null, 2)}`,
                type: RequestErrorType.UnknownError
              });
            } else if (error.response?.data) {
              log.warn(
                `Request[${id}]: errord with data ${JSON.stringify(error.response.data, null, 2)}`
              );
              errorPendingRequest(id, {
                message: error.response.data.message,
                type: RequestErrorType.UnknownError
              });
            } else if (error.message || error.request) {
              log.warn(`Request[${id}]: errord with message ${error.message}`);
              errorPendingRequest(id, {
                message: error.message || error.request,
                type: RequestErrorType.NetworkError
              });
            } else {
              log.warn(`Request[${id}]: errord with unknown ${JSON.stringify(error, null, 2)}`);
              // TODO(jqphu): is this even safe?
              errorPendingRequest(id, {
                message: (error && JSON.stringify(error, null, 2)) || null,
                type: RequestErrorType.UnknownError
              });
            }
          });

        return id;
      } catch (err) {

        // We want to throw the error after reporting it. That way the ContentScript can continue.
        Sentry.captureException(err);
        throw err;
      }
    }),

  reportError: t.procedure
    .input(
      z.object({
        message: z.string(),
        error: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      Sentry.withScope((scope) => {
        scope.setExtra("message", input.message);
        scope.setExtra("errorRaw", input.error);
        if (input.error) {
          Sentry.captureException(JSON.parse(input.error));
        } else {
          Sentry.captureMessage(input.message);
        }
      });
    })
});

export type BackgroundRouter = typeof backgroundRouter;

createChromeHandler({
  router: backgroundRouter
});

log.info("Completed background trpc router initialization");
