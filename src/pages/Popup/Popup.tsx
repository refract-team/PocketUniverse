import mixpanel from 'mixpanel-browser';
import { AiFillSetting } from 'react-icons/ai';
import React, { useEffect, useState } from 'react';

import Transaction from '../../containers/Transaction/Transaction';
import Settings from '../../containers/Settings/Settings';
import browser from 'webextension-polyfill';

mixpanel.init('00d3b8bc7c620587ecb1439557401a87');

const Popup = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.title = 'Pocket Universe';
    browser.storage.sync.get('first_open').then((result) => {
      if (Object.keys(result).length === 0) {
        mixpanel.track('First Open');
        browser.storage.sync.set({ first_open: true });
      }
    });
  }, []);

  return (
    <div className="flex flex-col text-white bg-gray-900 overflow-hidden min-w-[400px] min-h-screen items-center">
      <div className="flex flex-row p-4 text-center w-full">
        <button
          onClick={() => setSettingsOpen(false)}
          className="flex flex-row gap-4 text-xl leading-6 font-medium text-purple-300 hover:bg-gray-600 rounded-lg"
        >
          <img src="icon-128.png" className="h-10 my-auto" alt="logo" />
          <div className="font-light text-xl my-auto">Pocket Universe</div>
        </button>
        <button
          className="flex ml-auto my-auto hover:bg-gray-600 hover:rounded-full text-gray-200 text-xl w-7 h-7 justify-center items-center"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <AiFillSetting />
        </button>
      </div>
      <div className="flex grow w-full">
        {settingsOpen ? (
          <Settings closeSettings={() => setSettingsOpen(false)} />
        ) : (
          <Transaction />
        )}
      </div>
    </div>
  );
};

export default Popup;
