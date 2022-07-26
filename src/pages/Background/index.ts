import * as Sentry from '@sentry/browser';

import logger from '../../lib/logger';
import type { SimulateRequestArgs } from '../../lib/simulate_request_reply';
import { SIMULATE_REQUEST_COMMAND } from '../../lib/simulate_request_reply';
import type { StoredSimulation } from '../../lib/storage';
import {
  fetchSimulationAndUpdate,
  clearOldSimulations,
  simulationNeedsAction,
} from '../../lib/storage';

const log = logger.child({ component: 'Background' });

log.info('Background initialized');

Sentry.init({
  dsn: 'https://e130c8dff39e464bab4c609c460068b0@o1317041.ingest.sentry.io/6569982',
});

/// Inject the PocketUniverse script.
/// We need to do it this way so it can load synchronously. This is a workaround for manifestv3.
/// https://bugs.chromium.org/p/chromium/issues/detail?id=1207006
(chrome.scripting as any)
  .unregisterContentScripts()
  .then(() => {
    const scripts = [
      {
        id: 'PocketUniverse Script',
        matches: ['file://*/*', 'http://*/*', 'https://*/*'],
        js: ['injectedScript.bundle.js'],
        allFrames: true,
        runAt: 'document_start',
        world: 'MAIN',
      },
    ];
    // TODO(jqphu): the typing for chrome hasn't been updated.
    (chrome.scripting as any).registerContentScripts(scripts, () => {
      log.debug({ msg: 'Registered content script' });
    });
  })
  .catch((err: any) => {
    log.warn({ msg: 'Error', error: err });
  });

let currentPopup: undefined | number;

chrome.windows.onRemoved.addListener(
  (windowId: number) => {
    log.info(windowId, 'Removing popup');
    if (currentPopup && currentPopup === windowId) {
      currentPopup = undefined;
    }
  },
  {
    windowTypes: ['popup'],
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  Sentry.wrap(() => {
    if (area === 'sync' && changes.simulations?.newValue) {
      const oldSimulations = changes.simulations.oldValue;
      const newSimulations = changes.simulations.newValue;

      const oldFiltered = oldSimulations?.filter(
        (storedSimulation: StoredSimulation) => {
          return simulationNeedsAction(storedSimulation.state);
        }
      );
      const newFiltered = newSimulations.filter(
        (storedSimulation: StoredSimulation) => {
          return simulationNeedsAction(storedSimulation.state);
        }
      );

      log.debug(
        {
          currentPopup,
          oldSimulations,
          newSimulations,
          oldFiltered,
          newFiltered,
        },
        'New storage values'
      );

      // New values added, let's trigger a popup.
      // TODO(jqphu): do we need to check old values?
      // We have no popup and either we no filter at all (first add) or we now have a new element
      if (
        !currentPopup &&
        (!oldFiltered || newFiltered.length > oldFiltered.length)
      ) {
        // Indicate we're creating a popup so we don't have many.
        currentPopup = -1;

        log.info('Creating popup.');

        chrome.windows.create(
          {
            url: 'popup.html',
            type: 'popup',
            width: 360,
            height: 620,
          },
          (createdWindow) => {
            log.info(createdWindow?.id, 'Assigning popup to id');
            currentPopup = createdWindow?.id;
          }
        );

        return;
      }

      if (
        newFiltered.length === 0 &&
        oldFiltered.length === 1 &&
        currentPopup &&
        currentPopup !== -1
      ) {
        const closeId = currentPopup;
        log.info(closeId, 'Trying to remove popup');
        currentPopup = undefined;
        chrome.windows.remove(closeId);

        return;
      }

      // Let's send it to the front if it already exists
      if (currentPopup && currentPopup !== -1) {
        log.info('Focusing popup.');
        chrome.windows.update(currentPopup, {
          focused: true,
        });
      }
    }
  });
});

chrome.runtime.onMessage.addListener((request) => {
  Sentry.wrap(() => {
    if (request.command === SIMULATE_REQUEST_COMMAND) {
      log.info(request, 'Simulate request command');

      const args: SimulateRequestArgs = request.data;
      clearOldSimulations().then(() => fetchSimulationAndUpdate(args));
    } else {
      log.warn('Unknown command', request);
    }
  });
});