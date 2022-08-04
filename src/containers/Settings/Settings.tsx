import { MdClose } from 'react-icons/md';
import { Switch } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { setSettings, getSettings } from '../../lib/storage';
import React from 'react';

const Settings = ({ closeSettings }: { closeSettings: () => void }) => {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    getSettings().then((settings) => setEnabled(!settings.disable));
  }, []);

  const switchedCallback = async (enabled: boolean) => {
    await setSettings({ disable: !enabled });
    setEnabled(enabled);
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col grow">
        <div className="flex flex-row border-t border-gray-600 py-4">
          <div className="text-xl font-bold text-gray-100 px-4">Settings</div>
          <button
            onClick={closeSettings}
            className="text-2xl font-bold text-gray-400 ml-auto my-auto text-right mr-3 p-1 hover:bg-gray-600 hover:rounded-full"
          >
            <MdClose />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-4 pt-4 w-full">
          <div className="flex flex-row w-full">
            <div className="text-lg text-gray-100 my-auto">Run Simulations</div>
            <Switch
              checked={enabled}
              onChange={switchedCallback}
              className={`${enabled ? 'bg-blue-400' : 'bg-gray-500'}
          my-auto ml-auto relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full items-center border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
            >
              <span className="sr-only">Use setting</span>
              <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-6' : 'translate-x-0'}
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
              />
            </Switch>
          </div>
        </div>
      </div>
      <div>
        <img className="mt-auto w-screen" src="waves_bottom.png" alt="" />
      </div>
    </div>
  );
};

export default Settings;
