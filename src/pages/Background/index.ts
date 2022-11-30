import * as Sentry from '@sentry/browser';
import logger from '../../lib/logger';
import {
  PHISHING_REQUEST_COMMAND,
  PHISHING_RESPONSE_COMMAND,
  RequestArgs,
} from '../../lib/request';
import punycode from 'punycode';
import unidecode from 'unidecode';
import levenshtein from 'fast-levenshtein';
import { REQUEST_COMMAND } from '../../lib/request';
import type { StoredSimulation } from '../../lib/storage';
import {
  fetchSimulationAndUpdate,
  getAllowlist,
  addAllowlist,
  clearOldSimulations,
  simulationNeedsAction,
} from '../../lib/storage';
import { fetchUpdate } from '../../lib/server';
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

      if (
        newFiltered.length === 0 &&
        oldFiltered.length === 1 &&
        currentPopup &&
        currentPopup !== -1
      ) {
        const closeId = currentPopup;
        log.info(closeId, 'Trying to remove popup');
        currentPopup = undefined;
        browser.windows.remove(closeId);

        return;
      }

      // Let's send it to the front if it already exists
      if (currentPopup && currentPopup !== -1) {
        log.info('Focusing popup.');
        browser.windows.update(currentPopup, {
          focused: true,
        });
      }
    }
  });
});

const SAFE_DOMAIN_NAMES = ['opensea.com', 'blur.io'];

// Strips the leading www and TLD
const stripHostname = (hostname: string) => {
  let strippedWWW = hostname.replace(/^(www\.)/, '');
  let strippedTLD = strippedWWW.split('.').slice(0, -1).join('.');

  return strippedTLD;
};

const hostnameDistance = (
  leftStrippedHostname: string,
  rightStrippedHostname: string
) => {
  let leftDeunicode = unidecode(punycode.toUnicode(leftStrippedHostname));
  let rightDeunicode = unidecode(punycode.toUnicode(rightStrippedHostname));

  console.log('Comparing', leftDeunicode, ' to ', rightDeunicode);

  let score = levenshtein.get(leftDeunicode, rightDeunicode);

  console.log('Score', score);

  return score;
};

const isPhishing = (hostname: string) => {
  console.log('Checking', hostname);
  let strippedTestName = stripHostname(hostname);

  // By default, do a 2 distance threshold.
  let threshold = 2;

  // This indicates, it has homographs that are puny encoded. Increase the
  // threshold to catch a variety of character changes.
  if (punycode.encode(hostname) !== hostname) {
    threshold = 5;
  }

  for (const safeName of SAFE_DOMAIN_NAMES) {
    let strippedSafeName = stripHostname(safeName);
    // Not a safe URL but within 2 levenshtein distance report as phishing.
    if (
      strippedTestName != strippedSafeName &&
      hostnameDistance(strippedTestName, strippedSafeName) <= 2
    ) {
      return true;
    }
  }

  return false;
};

browser.runtime.onMessage.addListener((request, sender) => {
  Sentry.wrap(() => {
    if (request.command === REQUEST_COMMAND) {
      log.info(request, 'Request command');

      const args: RequestArgs = request.data;
      clearOldSimulations().then(() => fetchSimulationAndUpdate(args));
    } else if (request.command === PHISHING_REQUEST_COMMAND) {
      const hostname = request.url.hostname;

      getAllowlist().then((allowlist) => {
        // On allow list. Skip.
        if (allowlist.includes(hostname)) {
          return;
        }

        if (isPhishing(hostname) && sender?.tab?.id != undefined) {
          browser.tabs.sendMessage(sender.tab.id, {
            command: PHISHING_RESPONSE_COMMAND,
            url: request.url,
            phishing: true,
          });
        }
      });
    } else {
      log.warn(request, 'Unknown command');
    }
  });
});

// Should only be able to be called by pocketuniverse.app.
browser.runtime.onMessageExternal.addListener((request) => {
  console.log(`Adding "${request.hostname}" to allowlist`);
  addAllowlist(request.hostname);
});
