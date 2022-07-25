import mixpanel from 'mixpanel-browser';
import React, { useEffect } from 'react';

import Transaction from '../../containers/Transaction/Transaction';

mixpanel.init('00d3b8bc7c620587ecb1439557401a87');

const Popup = () => {
  useEffect(() => {
    document.title = 'Pocket Universe';
    chrome.storage.sync.get('first_open', (result) => {
      if (Object.keys(result).length === 0) {
        mixpanel.track('First Open');
        chrome.storage.sync.set({ first_open: true });
      }
    });
  }, []);

  return (
    <div className="flex flex-col text-white bg-gray-900 overflow-hidden min-w-[360px] min-h-screen items-center">
      <div className="flex flex-row p-5 text-center">
        <h3 className="flex flex-row gap-4 text-xl leading-6 font-medium text-purple-300">
          <img src="icon-128.png" className="h-10 my-auto" alt="logo" />
          <div className="font-light text-xl my-auto">Pocket Universe</div>
        </h3>
      </div>
      <div className="flex grow">
        <Transaction />
      </div>
    </div>
  );
};

export default Popup;
