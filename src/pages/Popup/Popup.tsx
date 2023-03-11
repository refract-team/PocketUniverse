import { AiOutlineClose } from 'react-icons/ai';
import { BiUserCircle } from 'react-icons/bi';
import { FiExternalLink } from 'react-icons/fi';
import React, { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import mixpanel from 'mixpanel-browser';

import Transaction from '../../containers/Transaction/Transaction';
import Settings from '../../containers/Settings/Settings';
import browser from 'webextension-polyfill';
import {
  UPDATE_KEY,
  UPDATE_MESSAGE_KEY,
  UPDATE_LINK_KEY,
} from '../../lib/storage';

import { updatePremiumStatus } from '../../lib/premium';

mixpanel.init('8989bf9bf536a55479ad0b467a2c3b2c', {
  persistence: 'localStorage',
  api_host: 'https://cloudrun.pocketuniverse.app',
  ignore_dnt: true,
});

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
    <div className="flex min-h-screen min-w-[400px] flex-col items-center overflow-hidden bg-gray-900 text-white">
      <div className="flex w-full flex-row p-4 text-center">
        <div className="flex flex-row gap-4 rounded-lg text-xl font-medium leading-6 text-purple-300">
          <img src="icon-128.png" className="my-auto h-10" alt="logo" />
          <div className="my-auto text-xl font-light">Pocket Universe</div>
        </div>
        <div className="my-auto ml-auto flex flex-row text-base text-purple-300">
          {!loading && (
            <div className="my-auto mr-1">
              {premium ? (
                <div className="my-auto p-1">Premium</div>
              ) : (
                <button
                  className="my-auto rounded-full border border-purple-300 p-1 px-2 hover:bg-gray-600"
                  onClick={() => {
                    mixpanel.track('click upgrade');
                  }}
                >
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
            className="my-auto ml-auto flex items-center justify-center text-gray-200 hover:rounded-full hover:bg-gray-600"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <IconContext.Provider
              value={{
                className: `p-1 ${
                  premium ? 'text-purple-400' : 'text-gray-100'
                }`,
                size: '44px',
              }}
            >
              <BiUserCircle />
            </IconContext.Provider>
          </button>
        </div>
      </div>

      <div className="flex w-full grow flex-col">
        {updateMessage && updateLink && (
          <div className="flex w-full flex-row border-t border-gray-600 p-2 pl-4">
            <a
              href={updateLink}
              target="_blank"
              className="inline text-base text-purple-300 hover:underline"
              rel="noreferrer"
            >
              {updateMessage}
              <FiExternalLink className="my-auto inline pl-1 text-xl" />
            </a>
            <button
              className="my-auto ml-auto mr-3 text-xl text-gray-200 hover:rounded-full hover:bg-gray-600"
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
        <div className="flex w-full grow">
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
