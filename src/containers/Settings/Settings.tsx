import mixpanel from 'mixpanel-browser';
import { Switch } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { AiFillLock } from 'react-icons/ai';
import { FiExternalLink } from 'react-icons/fi';
import { setSettings, Settings, getSettings } from '../../lib/storage';
import React from 'react';
import config from '../../config';

mixpanel.init('00d3b8bc7c620587ecb1439557401a87');

const SERVER_URL = config.server;

const Settings = ({ settingsOpen }: { settingsOpen: boolean }) => {
  const [enabledRunSimulations, setEnabledRunSimulations] = useState<boolean>(true);
  const switchedEnableRunSimulations = async (enabled: boolean) => {
    if (enabled) {
      mixpanel.track('Enable Simulations');
    } else {
      mixpanel.track('Disable Simulations');
    }

    await setSettings({ disable: !enabled });
    setEnabledRunSimulations(enabled);
  };

  const [enabledSniperMode, setEnabledSniperMode] = useState<boolean>(false);
  const switchEnabledSniperMode = async (enabled: boolean) => {
    if (enabled) {
      mixpanel.track('Enable Sniper Mode');
    } else {
      mixpanel.track('Disable Sniper Mode');
    }

    await setSettings({ sniperMode: enabled });
    setEnabledSniperMode(enabled);
  };


  const [loading, setLoading] = useState<boolean>(true);
  const [address, setAddress] = useState<string | undefined>(undefined);

  // We refresh the session details everytime the user clicks the settings button.
  //
  // TODO(jqphu): use a push notification from the website and the background page.
  useEffect(() => {
    getSettings().then((settings: Settings) => {
      setEnabledRunSimulations(!settings.disable);
      setEnabledSniperMode(settings.sniperMode);
    })

    fetch(`${SERVER_URL}/auth/session`).then(async (result) => {
      const session = await result.json()
      console.log(session);
      if (session?.user?.id) {
        console.log(`Logged in as ${session.user.id}`)
        setAddress(session.user.id);
      }
    }).catch((e) => {
      console.error(`Error`, e);
    }).finally(() => setLoading(false))
  }, [settingsOpen])


  const truncateAddress = (input: string) => {
    return String()
      .concat(
        input.substring(0, 6),
        '...',
        input.charAt(input.length - 4),
        input.charAt(input.length - 3),
        input.charAt(input.length - 2),
        input.charAt(input.length - 1)
      )
      .toString();
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col grow border-t border-gray-600">
        <div className="px-4 w-full">
          <div className="flex flex-col gap-4 pt-4 w-full">
            <div className="flex flex-row w-full">
              <div className="text-lg text-gray-100 my-auto">Run Simulations</div>
              <Switch
                checked={enabledRunSimulations}
                onChange={switchedEnableRunSimulations}
                className={`${enabledRunSimulations ? 'bg-blue-400' : 'bg-gray-500'}
          my-auto ml-auto relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full items-center border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
              >
                <span className="sr-only">Use setting</span>
                <span
                  aria-hidden="true"
                  className={`${enabledRunSimulations ? 'translate-x-6' : 'translate-x-0'}
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
              </Switch>
            </div>
          </div>
          <div className="flex flex-col py-8">
            <div className="text-2xl font-bold text-gray-100">Premium Features</div>
            {!loading && (
              <div>
                <a
                  href="https://dash.pocketuniverse.app"
                  target="_blank"
                  className="text-purple-300 text-sm hover:underline inline"
                  rel="noreferrer"
                >
                  {address ?
                    <span className="text-purple-300 text-sm">
                      Logged in as {truncateAddress(address)}
                    </span>
                    :
                    <span>
                      Click here to upgrade to premium or login in
                    </span>
                  }
                  <FiExternalLink className="inline pl-1 text-xl my-auto" />
                </a>
              </div>
            )}
          </div>
          <div className="flex flex-row w-full">
            <div className="flex flex-col text-lg text-gray-100 my-auto">
              Sniper Mode
              <span className="text-gray-100 text-xs">
                Skips the popup for purchases on the OS/LR/X2 contracts - use at your own risk!
              </span>
            </div>
            {!address ?
              <div className="text-4xl text-gray-100 my-auto ml-auto w-9 h-9">
                <AiFillLock />
              </div>
              :
              <Switch
                checked={enabledSniperMode}
                onChange={switchEnabledSniperMode}
                className={`${enabledSniperMode ? 'bg-blue-400' : 'bg-gray-500'}
                my-auto ml-auto relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full items-center border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
              >
                <span className="sr-only">Use setting</span>
                <span
                  aria-hidden="true"
                  className={`${enabledSniperMode ? 'translate-x-6' : 'translate-x-0'}
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
              </Switch>
            }
          </div>
        </div>
      </div>
      <img className="mt-auto w-screen" src="waves_bottom.png" alt="" />
    </div>
  );
};

export default Settings;
