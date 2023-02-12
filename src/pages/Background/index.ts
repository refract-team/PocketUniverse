import * as Sentry from '@sentry/browser';
import logger from '../../lib/logger';
import {
  REQUEST_COMMAND,
  BYPASS_COMMAND,
  VALID_CONTINUE_COMMAND,
} from '../../lib/request';
import lodash from 'lodash';
import { PartialRequestArgs, RequestArgs } from '../../lib/request';
import type { StoredSimulation } from '../../lib/storage';
import {
  fetchSimulationAndUpdate,
  clearOldSimulations,
  simulationNeedsAction,
} from '../../lib/storage';
import { fetchUpdate, fetchBypass } from '../../lib/server';
import {
  UPDATE_KEY,
  UPDATE_MESSAGE_KEY,
  UPDATE_LINK_KEY,
} from '../../lib/storage';
import browser from 'webextension-polyfill';

const log = logger.child({ component: 'Background' });

log.info('Background initialized');

Sentry.init({
  dsn: 'https://e130c8dff39e464bab4c609c460068b0@o1317041.ingest.sentry.io/6569982',
});

/// Add a quick form for uninstalls to see if we can improve the product.
browser.runtime.setUninstallURL('https://forms.gle/YNRYTWWJRQnA99qV9');

/// Add an onboarding URL on install.
browser.runtime.onInstalled.addListener((obj) => {
  // On first install, create the tab.
  if (obj.reason === 'install') {
    browser.tabs.create({ url: 'https://www.pocketuniverse.app/onboarding' });
  }
});

// Firefox we use manifest v2 where scripting won't be defined
if (browser.scripting) {
  /// Inject the PocketUniverse script.
  /// We need to do it this way so it can load synchronously. This is a workaround for manifestv3.
  /// https://bugs.chromium.org/p/chromium/issues/detail?id=1207006
  (browser.scripting as any)
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
      // TODO(jqphu): the typing for browser hasn't been updated.
      (browser.scripting as any).registerContentScripts(scripts, () => {
        log.debug({ msg: 'Registered content script' });
      });
    })
    .catch((err: any) => {
      log.warn({ msg: 'Error', error: err });
    });
}

const manifestData = chrome.runtime.getManifest();
browser.storage.local
  .get(UPDATE_KEY)
  .then(async ({ updates }) => {
    // Either we've updated the version, or they haven't dismissed this message.
    //
    // Let's retrieve the message.
    //
    // This is a pretty cheap request so we're okay doing this.
    if (updates !== manifestData.version) {
      const { message, link } = await fetchUpdate({
        manifestVersion: manifestData.version,
      });
      browser.storage.local.set({
        [UPDATE_MESSAGE_KEY]: message,
        [UPDATE_LINK_KEY]: link,
      });
    }
  })
  .catch((e) => {
    log.info('Could not fetch update message.', e);
  });

let currentPopup: undefined | number;

browser.windows.onRemoved.addListener((windowId: number) => {
  log.info(windowId, 'Removing popup');
  if (currentPopup && currentPopup === windowId) {
    currentPopup = undefined;
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  Sentry.wrap(() => {
    if (area === 'local' && changes.simulations?.newValue) {
      const popup = currentPopup;

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
          popup,
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
      if (!popup && (!oldFiltered || newFiltered.length > oldFiltered.length)) {
        // Indicate we're creating a popup so we don't have many.
        currentPopup = -1;

        log.info('Creating popup.');

        browser.windows
          .create({
            url: 'popup.html',
            type: 'popup',
            width: 420,
            height: 760,
          })
          .then((createdWindow) => {
            log.info(createdWindow?.id, 'Assigning popup to id');
            currentPopup = createdWindow?.id;
          });

        return;
      }

      if (newFiltered.length === 0 && popup && popup !== -1) {
        const closeId = popup;
        log.info(closeId, 'Trying to remove popup');
        currentPopup = undefined;
        browser.windows.remove(closeId);

        return;
      }

      // Let's send it to the front if it already exists
      if (popup && popup !== -1) {
        log.info('Focusing popup.');
        browser.windows.update(popup, {
          focused: true,
        });
      }
    }
  });
});

// List of requests the user has authorized.
const validRequests: StoredSimulation[] = [];

const openBypassPopup = async (
  request: PartialRequestArgs,
  hostname: string,
  chainId: string
) => {
  // Given enough malicious bypass requests to a hostname we will block it.
  const shouldPopup = await fetchBypass({ request, hostname, chainId, validRequests });

  if (shouldPopup) {
    browser.windows.create({
      url: 'bypass.html',
      type: 'popup',
      width: 760,
      height: 760,
    });
  }
};

browser.runtime.onMessage.addListener((request) => {
  Sentry.wrap(() => {
    if (request.command === REQUEST_COMMAND) {
      log.info(request, 'Request command');

      const args: RequestArgs = request.data;
      clearOldSimulations().then(() => fetchSimulationAndUpdate(args));
    } else if (request.command === BYPASS_COMMAND) {
      const partialRequestArgs: PartialRequestArgs = request.data.request;
      const hostname = request.data.hostname;
      const chainId = request.data.chainId;

      // If we can't find the request in our stored simulation, then it has bypassed. Show a warning.
      findRequest(partialRequestArgs, validRequests).then((idx) => {
        if (idx !== -1) {
          // Remove this request from valid requests, we've checked it.
          validRequests.splice(idx, 1);
        } else {
          // We couldn't find the request, show bypass popup.
          openBypassPopup(partialRequestArgs, hostname, chainId);
        }
      });
    } else if (request.command === VALID_CONTINUE_COMMAND) {
      // Valid request has been added.
      validRequests.push(request.data);
      console.log('Adding', validRequests);
    } else {
      log.warn(request, 'Unknown command');
    }
  });
});

// Returns the id of the request if it exists.
const findRequest = async (
  args: PartialRequestArgs,
  simulations: StoredSimulation[]
) => {

  // Delay 200ms.
  //
  // This ensures the valid continue request has come in, as well as helping out popup come out AFTER metamask.
  await new Promise(resolve => setTimeout(resolve, 200));

  const idx = simulations.findIndex((sim) => {
    // If there are no args this is an old request.
    if (!sim.args) {
      return false;
    }

    const simArgs = sim.args;

    if (!lodash.isEqual(simArgs.signer, args.signer)) {
      return false;
    }

    if ('transaction' in simArgs && 'transaction' in args) {
      return (
        lodash.isEqual(simArgs.transaction.from, args.transaction.from) &&
        lodash.isEqual(simArgs.transaction.to, args.transaction.to) &&
        lodash.isEqual(simArgs.transaction.value, args.transaction.value) &&
        lodash.isEqual(simArgs.transaction.data, args.transaction.data)
      );
    } else if ('hash' in simArgs && 'hash' in args) {
      return lodash.isEqual(simArgs.hash, args.hash);
    } else if ('signMessage' in simArgs && 'signMessage' in args) {
      // We need to use lodash since these fields might be wrong (e.g. app error returning NaN we still need this to be true).
      return lodash.isEqual(simArgs.signMessage, args.signMessage);
    } else if ('domain' in simArgs && 'domain' in args) {
      return (
        lodash.isEqual(simArgs.domain, args.domain) &&
        lodash.isEqual(simArgs.message, args.message) &&
        lodash.isEqual(simArgs.primaryType, args.primaryType)
      );
    } else {
      return false;
    }
  });

  return idx;
};
