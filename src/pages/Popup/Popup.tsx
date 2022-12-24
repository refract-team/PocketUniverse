import { AiOutlineClose } from 'react-icons/ai';
import { BiUserCircle } from 'react-icons/bi';
import { FiExternalLink } from 'react-icons/fi';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import posthog from 'posthog-js';

import Transaction from '../../containers/Transaction/Transaction';
import Settings from '../../containers/Settings/Settings';
import browser from 'webextension-polyfill';
import {
  UPDATE_KEY,
  UPDATE_MESSAGE_KEY,
  UPDATE_LINK_KEY,
} from '../../lib/storage';

import { updatePremiumStatus } from '../../lib/premium';

posthog.init('phc_gzRYvv138ZfcXOOsW2Kxd90YkjNPcG6gFnTScMZlXrL', { api_host: 'https://app.posthog.com' });

const Popup = () => {
  const manifestData = chrome.runtime.getManifest();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateLink, setUpdateLink] = useState<string | null>(null);

  useEffect(() => {
    browser.storage.local.get(UPDATE_KEY).then(({ updates }) => {
      if (!updates || updates !== manifestData.version) {
        browser.storage.local
          .get([UPDATE_MESSAGE_KEY, UPDATE_LINK_KEY])
          .then(({ updates_message, updates_link }) => {
            if (updates_message && updates_link) {
              setUpdateMessage(updates_message);
              setUpdateLink(updates_link);
            }
          });
      }
    });

    document.title = 'Pocket Universe';
    browser.storage.sync.get('first_open').then((result) => {
      if (Object.keys(result).length === 0) {
        browser.storage.sync.set({ first_open: true });
      }
    });
  }, [manifestData.version]);

  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    updatePremiumStatus()
      .then((session) => {
        if (session.premium) {
          setPremium(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col text-white bg-gray-900 overflow-hidden min-w-[400px] min-h-screen items-center">
      <div className="flex flex-row p-4 text-center w-full">
        <div className="flex flex-row gap-4 text-xl leading-6 font-medium text-purple-300 rounded-lg">
          <img src="icon-128.png" className="h-10 my-auto" alt="logo" />
          <div className="font-light text-xl my-auto">Pocket Universe</div>
        </div>
        <div className="flex flex-row ml-auto text-base text-purple-300 my-auto">
          {!loading && (
            <div className="mr-1 my-auto">
              {premium ? (
                <div className="my-auto p-1">Premium</div>
              ) : (
                <button className="my-auto border border-purple-300 hover:bg-gray-600 rounded-full p-1 px-2">
                  <a
                    href="https://dash.pocketuniverse.app"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Upgrade
                  </a>
                </button>
              )}
            </div>
          )}
          <button
            className="flex ml-auto my-auto hover:bg-gray-600 hover:rounded-full text-gray-200 justify-center items-center"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <IconContext.Provider
              value={{
                className: `p-1 ${premium ? 'text-purple-400' : 'text-gray-100'
                  }`,
                size: '44px',
              }}
            >
              <BiUserCircle />
            </IconContext.Provider>
          </button>
        </div>
      </div>

      <div className="flex flex-col grow w-full">
        {updateMessage && updateLink && (
          <div className="flex flex-row border-t border-gray-600 w-full p-2 pl-4">
            <a
              href={updateLink}
              target="_blank"
              className="text-purple-300 text-base hover:underline inline"
              rel="noreferrer"
            >
              {updateMessage}
              <FiExternalLink className="inline pl-1 text-xl my-auto" />
            </a>
            <button
              className="ml-auto my-auto hover:bg-gray-600 hover:rounded-full text-gray-200 text-xl mr-3"
              onClick={() => {
                browser.storage.local.set({
                  [UPDATE_KEY]: manifestData.version,
                });
                setUpdateMessage(null);
              }}
            >
              <AiOutlineClose />
            </button>
          </div>
        )}
        <div className="flex grow w-full">
          {settingsOpen ? (
            <Settings settingsOpen={settingsOpen} />
          ) : (
            <Transaction />
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
