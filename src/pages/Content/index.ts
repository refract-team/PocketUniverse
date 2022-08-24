import logger from '../../lib/logger';
import type { RequestArgs } from '../../lib/request';
import {
  listenToRequest,
  dispatchResponse,
  REQUEST_COMMAND,
  Response,
} from '../../lib/request';
import { dispatchSettings } from '../../lib/settings';
import type { StoredSimulation } from '../../lib/storage';
import { removeSimulation, StoredSimulationState } from '../../lib/storage';

import browser from 'webextension-polyfill';

var s = document.createElement('script');
// This should intentionally fail on chrome as we inject the script in the background file.
s.src = browser.runtime.getURL('injectedScript.bundle.js');
(document.head || document.documentElement).appendChild(s);
s.onload = () => { s.remove() };

const log = logger.child({ component: 'Content-Script' });

log.debug({ msg: 'Content Script Loaded' });

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

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.settings?.newValue) {
    dispatchSettings(changes.settings.newValue);
  }
});

listenToRequest((request: RequestArgs) => {
  log.info({ request }, 'Request');
  ids.push(request.id);

  // Page has sent an event, start listening to storage changes.
  // This ensures we don't listen to storage changes on every singel webpage.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.simulations?.newValue) {
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
