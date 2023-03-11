import { Switch } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { AiFillLock, AiFillCopy } from 'react-icons/ai';
import { RiseLoader } from 'react-spinners';
import { FiExternalLink } from 'react-icons/fi';
import { setSettings, Settings, getSettings } from '../../lib/storage';
import React from 'react';
import { updatePremiumStatus } from '../../lib/premium';
import mixpanel from 'mixpanel-browser';

mixpanel.init('8989bf9bf536a55479ad0b467a2c3b2c', {
  persistence: 'localStorage',
  api_host: 'https://cloudrun.pocketuniverse.app',
  ignore_dnt: true,
});

const SettingsComponent = ({ settingsOpen }: { settingsOpen: boolean }) => {
  const [enabledRunSimulations, setEnabledRunSimulations] =
    useState<boolean>(true);
  const switchedEnableRunSimulations = async (enabled: boolean) => {
    mixpanel.track('set run simulations', { enabled });

    await setSettings({ disable: !enabled });
    setEnabledRunSimulations(enabled);
  };

  const [enabledHyperdriveMode, setEnabledHyperdriveMode] =
    useState<boolean>(false);
  const switchEnabledHyperdriveMode = async (enabled: boolean) => {
    mixpanel.track('set hyperdrive', { enabled });

    await setSettings({ hyperdrive: enabled });
    setEnabledHyperdriveMode(enabled);
  };

  const [loading, setLoading] = useState<boolean>(true);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [premium, setPremium] = useState<boolean>(false);

  // We refresh the session details everytime the user clicks the settings button.
  //
  // TODO(jqphu): use a push notification from the website and the background page.
  useEffect(() => {
    // Update the premium status first, this might set the values in storage if the user is not logged in.
    updatePremiumStatus()
      .then((session) => {
        setAddress(session?.address);

        console.log(
          `Logged in as ${session?.address} with premium ${session?.premium}`
        );

        if (session?.premium) {
          setPremium(session.premium);
        }
      })
      .catch((e) => {
        console.error(`Error`, e);
      })
      .finally(() => {
        // We want to run this regardless if premium call succeeded or not.
        getSettings()
          .then((settings: Settings) => {
            setEnabledRunSimulations(!settings.disable);
            setEnabledHyperdriveMode(settings.hyperdrive);
          })
          .finally(() => setLoading(false));
      });
  }, [settingsOpen]);

  const referralLink = `https://dash.pocketuniverse.app/ref/${address}`;

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
      <div className="flex grow flex-col border-t border-gray-600">
        {loading ? (
          <div className="flex grow flex-col items-center justify-center">
            <RiseLoader color="white" />
            <div className="pt-4 text-2xl text-gray-100">Loading...</div>
          </div>
        ) : (
          <div className="w-full px-4">
            <div className="flex w-full flex-col gap-4 pt-4">
              <div className="flex w-full flex-row">
                <div className="my-auto text-lg font-medium text-gray-100">
                  Run Simulations
                </div>
                <Switch
                  checked={enabledRunSimulations}
                  onChange={switchedEnableRunSimulations}
                  className={`${
                    enabledRunSimulations ? 'bg-blue-400' : 'bg-gray-500'
                  }
          relative my-auto ml-auto inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
                >
                  <span className="sr-only">Use setting</span>
                  <span
                    aria-hidden="true"
                    className={`${
                      enabledRunSimulations ? 'translate-x-6' : 'translate-x-0'
                    }
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                  />
                </Switch>
              </div>
            </div>
            <div className="flex flex-col py-4">
              <div className="text-2xl font-bold text-gray-100">
                Premium Features
              </div>
              <div>
                <a
                  href="https://dash.pocketuniverse.app"
                  target="_blank"
                  className="inline text-sm text-purple-300 hover:underline"
                  rel="noreferrer"
                >
                  {address ? (
                    <span className="text-sm text-purple-300">
                      Logged in as {truncateAddress(address)}
                      {!premium && (
                        <span>
                          &nbsp;but you don't have Premium. Click here to
                          upgrade.
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>Click here to upgrade to premium or login in</span>
                  )}
                  <FiExternalLink className="my-auto inline pl-1 text-xl" />
                </a>
              </div>
            </div>
            <div className="flex w-full flex-row pb-4">
              <div className="my-auto flex flex-col text-lg text-gray-100">
                <div className="font-medium">Hyperdrive</div>
                <span className="mr-2 text-sm text-gray-100">
                  Skips popups for purchases and accepting offers on
                  marketplaces.
                  <a
                    href="https://pocketuniverse.notion.site/Hyperdrive-33dee2e5d41040a6a21708cd7167c030"
                    target="_blank"
                    className="inline text-purple-300 hover:underline"
                    rel="noreferrer"
                  >
                    &nbsp;Click to learn more.
                    <FiExternalLink className="my-auto inline pl-1 text-xl" />
                  </a>
                </span>
              </div>
              {address && premium ? (
                <Switch
                  checked={enabledHyperdriveMode}
                  onChange={switchEnabledHyperdriveMode}
                  className={`${
                    enabledHyperdriveMode ? 'bg-blue-400' : 'bg-gray-500'
                  }
                relative my-auto ml-auto inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
                >
                  <span className="sr-only">Use setting</span>
                  <span
                    aria-hidden="true"
                    className={`${
                      enabledHyperdriveMode ? 'translate-x-6' : 'translate-x-0'
                    }
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                  />
                </Switch>
              ) : (
                <div className="my-auto ml-auto w-16">
                  <div className="my-auto ml-auto h-9 w-9 text-4xl text-gray-100">
                    <AiFillLock />
                  </div>
                </div>
              )}
            </div>
            <div className="flex w-full flex-col items-center text-center text-xl">
              <a
                href="https://dash.pocketuniverse.app/refer"
                target="_blank"
                className="inline text-sm text-purple-300 hover:underline"
                rel="noreferrer"
              >
                Refer friends to unlock hyperdrive and more!
                <FiExternalLink className="my-auto inline pl-1 text-xl" />
              </a>
              {address && (
                <button
                  className="flex w-72 flex-row justify-center rounded-lg border border-white p-1 pt-1 text-center text-gray-100 hover:bg-gray-800"
                  onClick={async (e) => {
                    e.preventDefault();
                    mixpanel.track('copied referral');
                    await navigator.clipboard.writeText(referralLink);
                  }}
                >
                  <div className="w-64 truncate text-center text-sm">
                    {referralLink}
                  </div>
                  <AiFillCopy />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <img className="mt-auto w-screen" src="waves_bottom.png" alt="" />
    </div>
  );
};

export default SettingsComponent;
