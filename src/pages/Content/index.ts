import logger from '../../lib/logger';
import { RequestArgs } from '../../lib/request';
import {
  listenToRequest,
  dispatchResponse,
  REQUEST_COMMAND,
  PHISHING_REQUEST_COMMAND,
  PHISHING_RESPONSE_COMMAND,
  Response,
} from '../../lib/request';
import type { StoredSimulation } from '../../lib/storage';
import {
  Settings,
  getSettings,
  removeSimulation,
  StoredSimulationState,
} from '../../lib/storage';

import browser from 'webextension-polyfill';

var s = document.createElement('script');
// This should intentionally fail on chrome as we inject the script in the background file.
s.src = browser.runtime.getURL('injectedScript.bundle.js');
(document.head || document.documentElement).appendChild(s);
s.onload = () => {
  s.remove();
};

const log = logger.child({ component: 'Content-Script' });

log.debug({ msg: 'Content Script Loaded' });

const KNOWN_MARKETPLACES = [
  // Opensea
  '0x00000000006c3852cbef3e08e8df289169ede581',
  // Blur
  '0x000000000000ad05ccc4f10045630fb830b95127',
  // Blur
  '0x39da41747a83aee658334415666f3ef92dd0d541',
  // X2Y2
  '0x74312363e45dcaba76c59ec49a7aa8a65a67eed3',
  // Looksrare
  '0x59728544b08ab483533076417fbbb2fd0b17ce3a',
];

// There is a bit of a memory leak here. If the user navigates away from this page before the request is sent in, the request will never be removed from storage.
// There shouldn't be too many requests though so this is okay.

/// TODO(jqphu): de-dup this with the code in the injected script.
let ids: string[] = [];

const maybeRemoveId = (id: string) => {
  log.debug('Maybe removing id', id);
  if (ids.includes(id)) {
    log.debug('RemovingId', id);
    ids = ids.filter((thisId) => thisId !== id);
    removeSimulation(id);
  }
};

listenToRequest(async (request: RequestArgs) => {
  log.info({ request }, 'Request');
  ids.push(request.id);

  getSettings().then((args: Settings) => {
    if (args.disable) {
      // Immediately respond continue.
      dispatchResponse({
        id: request.id,
        type: Response.Continue,
      });

      return;
    }

    if (
      args.hyperdrive &&
      'transaction' in request &&
      KNOWN_MARKETPLACES.includes(request.transaction.to.toLowerCase())
    ) {
      // Immediately respond continue.
      dispatchResponse({
        id: request.id,
        type: Response.Continue,
      });

      return;
    }

    // Page has sent an event, start listening to storage changes.
    // This ensures we don't listen to storage changes on every singel webpage.
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.simulations?.newValue) {
        const newSimulations = changes.simulations.newValue;
        log.info(newSimulations, 'Dispatching new values for simulation');

        // Note: this will dispatch to **all** content pages.
        // To address this later we can generate a random id for each page. Append it to the request.
        // Either way, this should be pretty cheap. It's just DOM communication.
        // TODO(jqphu): measure & generate random id's so we don't dispatch so many events.
        newSimulations.forEach((simulation: StoredSimulation) => {
          // Either dispatch the corresponding event, or push the item to new simulations.
          if (simulation.state === StoredSimulationState.Confirmed) {
            log.debug('Dispatch confirmed', simulation.id);
            dispatchResponse({
              id: simulation.id,
              type: Response.Continue,
            });
            maybeRemoveId(simulation.id);
          } else if (simulation.state === StoredSimulationState.Rejected) {
            log.debug('Dispatch rejected', simulation.id);
            dispatchResponse({
              id: simulation.id,
              type: Response.Reject,
            });
            maybeRemoveId(simulation.id);
          }
        });
      }
    });

    browser.runtime.sendMessage({
      command: REQUEST_COMMAND,
      data: request,
    });
  });
});

const getRedirectString = (hostname: string, href: string) => {
  const querystring = new URLSearchParams({ hostname, href });

  return `https://dash.pocketuniverse.app/phishing?${querystring}`;
};

const phishingRedirect = () => {
  // Get the current location.
  const { hostname, href } = window.location;

  console.warn('Redirecting due to phishing link detected', hostname);

  // Update the location.
  window.location.href = getRedirectString(hostname, href);
};

browser.runtime.sendMessage({
  command: PHISHING_REQUEST_COMMAND,
  url: window.location,
});

browser.runtime.onMessage.addListener((message) => {
  // If the response was made for this tab, redirect to phishing.
  if (message.command === PHISHING_RESPONSE_COMMAND) {
    const { hostname } = window.location;
    if (message.url.hostname === hostname) {
      phishingRedirect();
    }
  }
});
