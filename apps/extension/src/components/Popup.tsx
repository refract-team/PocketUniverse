import logoImage from "data-base64:~assets/android-chrome-192x192.png";
import arbitrumLogo from "data-base64:~assets/arbitrum-logo.png";
import polygonLogo from "data-base64:~assets/polygon-logo.png";
import ethereumLogo from "data-base64:~assets/ethereum-logo.png";
import bnbLogo from "data-base64:~assets/bnb-logo.png";
import clsx from "clsx";
import { Switch } from "@headlessui/react";
import { useStorage } from "@plasmohq/storage/hook";
import { SIMULATIONS_ON, SKIP_MARKETPLACES } from "~utils/extension-store";
import { usePostHog } from "posthog-js/react";
import { FaDiscord } from "@react-icons/all-files/fa/FaDiscord";
import { FaTwitter } from "@react-icons/all-files/fa/FaTwitter";


export function Popup() {
  const posthog = usePostHog();

  return (
    <div className="flex min-h-screen min-w-[400px] flex-col bg-gray-800 text-gray-100">
      <div className="flex w-full grow flex-col">
        <div className="flex flex-col items-center justify-center p-6">
          <div className="flex justify-center gap-2 p-2">
            <img className="my-auto block h-20 w-auto" src={logoImage} alt="Pocket Universe Logo" />
            <div className="text-primary-300 my-auto flex flex-col text-3xl">
              <div>Pocket</div>
              <div>Universe</div>
            </div>
          </div>
        </div>
        <div className="shadow-dark-border flex w-full grow flex-col justify-center gap-2 py-8 text-start font-medium">
          <Toggle
            optionName="Skip on official marketplaces"
            storageName={SKIP_MARKETPLACES}
            initialValue={false}
            url="https://pocketuniverse.notion.site/Hyperdrive-33dee2e5d41040a6a21708cd7167c030"
          />
          <Toggle
            initialValue={true}
            optionName="Turn Simulations On/Off"
            storageName={SIMULATIONS_ON}
          />
          <div className="flex flex-col self-center text-center pt-4">
            <div className="text-base text-gray-300">Keeping you safe on</div>
            <div className="mx-auto flex flex-row items-center justify-center gap-2 self-center py-2">
              <img className="my-auto block h-10 w-auto" src={ethereumLogo} alt="Ethereum Logo" />
              <img className="my-auto block h-10 w-auto" src={polygonLogo} alt="Polygon Logo" />
              {/* Add a tiny margin-x since arbitrum image has no x whitespace  making it look off center */}
              <img
                className="mx-1 my-auto ml-1 block h-10 w-auto"
                src={arbitrumLogo}
                alt="Arbitrum Logo"
              />
              <img className="my-auto block h-10 w-auto" src={bnbLogo} alt="BNB Logo" />
            </div>
          </div>
        </div>

        <div className="h-15 sticky bottom-0 flex inline-flex justify-center gap-6 bg-gray-900 px-2 py-5">
          <div className="text-primary-300 flex flex-grow items-center justify-center gap-6">
            <a
              href="https://twitter.com/PocketUniverseZ"
              target="_blank"
              onClick={() => {
                posthog?.capture("twitter_click_homepage");
              }}
              className="border-primary-300 inline-flex h-10 w-14 items-center justify-center rounded-lg border bg-gray-800"
              rel="noreferrer">
              <FaTwitter size={24} />
            </a>
            <a
              href="https://discord.com/invite/nVdz8tKkBr"
              target="_blank"
              onClick={() => {
                posthog?.capture("discord_click_homepage");
              }}
              className="border-primary-300 inline-flex h-10 w-14 items-center justify-center rounded-lg border bg-gray-800"
              rel="noreferrer">
              <FaDiscord size={24} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  optionName,
  storageName,
  initialValue,
  url
}: {
  optionName: string;
  initialValue: boolean;
  storageName: string;
  url?: string;
}) {
  const posthog = usePostHog();

  const [enabled, setEnabled, { isHydrated }] = useStorage(
    { key: storageName, area: "local" },
    (v: boolean) => (v === undefined ? initialValue : v)
  );

  return (
    <div className="flex px-5 py-2 text-lg text-gray-100">
      <a href={url} target="_blank" rel="noreferrer">
        <div className={clsx({ "hover:underline": url !== undefined })}>{optionName}</div>
      </a>
      <div className="flex-grow" />
      {isHydrated && (
        <Switch
          checked={enabled}
          onChange={(checked: boolean) => {
            // If there are multiple users, this value could become inconsistent. Best effort for now.
            posthog?.people.set({ [storageName]: checked });
            setEnabled(checked);
          }}
          className={clsx("relative inline-flex h-6 w-11 items-center rounded-full", {
            "bg-primary-500": enabled,
            "bg-gray-500": !enabled
          })}>
          <span
            className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition", {
              "translate-x-6": enabled,
              "translate-x-1": !enabled
            })}
          />
        </Switch>
      )}
    </div>
  );
}

export default Popup;
