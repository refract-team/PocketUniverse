import type { PlasmoCSConfig } from "plasmo";

// Inject in every frame of every page.
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: true
};

import { shouldSkip } from "./skip";
import { createTRPCProxyClient } from "@trpc/client";
import { chromeLink } from "trpc-chrome/link";

import type { BackgroundRouter } from "~background/router";
import { REQUEST_STORE_NAME, extensionStore } from "~utils/extension-store";
import { ContentReceiver, InjectedSender } from "~utils/request";
import type { RequestArguments, State } from "~types";
import { Action, StateKind } from "~types";
import { logContentScript as log } from "~utils/log";

log.info("Initializing requests manager");

const port = chrome.runtime.connect();
export const backgroundClient = createTRPCProxyClient<BackgroundRouter>({
  links: [chromeLink({ port })]
});

// No queuing, if a new request comes this will override it.
let pendingRequest = null;

// Initialize a receiver to listen to events.
new ContentReceiver({
  // Forward request to background client.
  simulateRequest: async (data: RequestArguments) => {
    if (await shouldSkip(data)) {
      return;
    }

    const { hostname } = window.location;

    try {
      const id = await backgroundClient.request.mutate({ hostname, args: data });
      return new Promise(async (resolve, reject) => {
        pendingRequest = {
          id,
          resolve,
          reject
        };
      });
    } catch(e) {
      log.error(`Some error trying to send request to background ${e}`);
      throw e;
    }
  },

  reportError: async (data: { message: string; error?: any }) => {
    backgroundClient.reportError.mutate(data);
  }
});

// Requests to the injected script
new InjectedSender();

extensionStore.watch({
  [REQUEST_STORE_NAME]: async ({ newValue }: { newValue: State }) => {
    log.info(`New value for request store: ${JSON.stringify(newValue, null, 2)}`);

    if (!pendingRequest) {
      return;
    }

    const id = pendingRequest.id;

    if (newValue.id != id) {
      log.info(`Value for id ${id} is not found, instead have: ${pendingRequest}`);
      return;
    }

    log.info(`New state is ${newValue}`);
    if (newValue.state == StateKind.Completed) {
      if (newValue.action === Action.Resolve) {
        pendingRequest.resolve(newValue.response);
      } else {
        pendingRequest.reject(newValue.response);
      }

      pendingRequest.resolve(newValue.action);
      pendingRequest = null;
    }
  }
});

// Bypass checks
// Thanks Rosco - https://github.com/RevokeCash/browser-extension/blob/master/src/content-scripts/bypass-check.tsx
let chainId = 1;

// Bypass checks for MetaMask
window.addEventListener("message", async (message) => {
  const { target } = message?.data ?? {};
  const { name, data } = message?.data?.data ?? {};
  const { hostname } = window.location;

  if (name !== "metamask-provider" || !data) return;
  if (target === "metamask-contentscript") {
    // Trying to send messages directly to metamask should not be supported. It should go through pocket universe.
    if (
      data.method === "eth_sendTransaction" ||
      data.method === "eth_signTypedData_v3" ||
      data.method === "eth_signTypedData_v4" ||
      data.method === "eth_sendTransaction" ||
      data.method === "eth_sign" ||
      data.method === "personal_sign"
    ) {
      const request = {
        ...data,
        chainId: `0x${chainId.toString(16)}`,
        signer: "0x0000000000000000000000000000000000000000"
      };

      log.debug(`Bypass Request Check. Data: ${JSON.stringify(request, null, 2)}`);

      // Either pocket universe is disabled, this isn't a supported chain or some other reasons.
      if (await shouldSkip(request)) {
        log.debug(`Skipping check based on request`);
        return;
      }

      // Check bypass.
      backgroundClient.bypassCheck.mutate({
        hostname,
        request
      });
    }
  }

  if (target === "metamask-inpage" && data?.method?.includes("chainChanged")) {
    chainId = Number(data?.params?.chainId ?? chainId);
  }
});

export {};
