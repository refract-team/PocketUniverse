import classNames from "classnames";
import brokenRobot from "data-base64:~assets/broken-robot.png";
import collabland from "data-base64:~assets/collabland.png";
import hashPersonalSign from "data-base64:~assets/hash-personal-sign.png";
import highWarning from "data-base64:~assets/high-warning.png";
import blurLogo from "data-base64:~assets/blur.png";
import mediumWarning from "data-base64:~assets/medium-warning.png";
import networkError from "data-base64:~assets/network-error.png";
import safePersonalSign from "data-base64:~assets/safe-personal-sign.png";
import unknownEIP712 from "data-base64:~assets/unknown-eip712.png";
import unknownError from "data-base64:~assets/unknown-error.png";
import { useState } from "react";
import { AiFillCopy } from "@react-icons/all-files/ai/AiFillCopy";
import { Tooltip } from "react-tooltip";
import { utils } from "ethers";
import { usePostHog } from "posthog-js/react";

import { Infographic } from "~components/Infographic";
import { ShadowTextBox } from "~components/ShadowTextBox";
import type {
  ServerRpcMethods,
  ActionRequired as ActionRequiredArgs,
  Alert,
  AssetChange as AssetChangeArg,
  RequestError,
  ServerResponse,
  ToAddressInfo
} from "~types";
import { RequestErrorType } from "~types";

/// Single ActionRequired Transaction View
export function ActionRequired({ request }: { request: ActionRequiredArgs }) {
  if ("success" in request.response) {
    return <Success hostname={request.hostname} method={request.request.method} response={request.response.success} />;
  } else {
    return <Error id={request.id} error={request.response.error} />;
  }
}

export function Error({ id, error }: { id: string; error?: RequestError }) {
  switch (+error.type) {
    case RequestErrorType.NetworkError:
      return <NetworkError message={error.message} />;
    case RequestErrorType.UnknownError:
    default:
      return <UnknownError id={id} message={error.message} />;
  }
}

export function NetworkError({ message }: { message?: string }) {
  return (
    <Infographic
      image={networkError}
      alt="computer connected to datacenter"
      title="Could not reach servers"
      description={
        <div>
          Check your internet connection and contact us on Discord or Twitter if the issue persists
          <br />
          <br />
          {message && <div>Error message: {message}</div>}
        </div>
      }
    />
  );
}

export function UnknownError({ id, message }: { id: string; message?: string }) {
  return (
    <Infographic
      image={unknownError}
      alt="broken lightbulb"
      title="You encountered an error!"
      description={
        <div>
          We were unable to process your request with {id}.
          <br />
          <br />
          If this keeps happening, please contact the team through Discord or Twitter
          <br />
          <br />
          {message && <div>Error message: {message}</div>}
        </div>
      }
    />
  );
}

export function Success({ hostname, method, response }: { hostname: string; method: ServerRpcMethods, response: ServerResponse }) {
  switch (response.type) {
    case "assets":
      return <Assets response={response} />;
    case "revertedSimulation":
      return <Reverted message={response.message} />;
    case "hashPersonalSign":
      return <HashPersonalSign />;
    case "safePersonalSign":
      return <SafePersonalSign />;
    case "ethSign":
      return <EthSign />;
    case "blurBulk":
      return <BlurBulk hostname={hostname} />;
    case "unknownEIP712Signature":
      return <UnknownEIP712Signature />;
    case "collabLand":
      return <CollabLand user={response.user} community={response.community} />;
  }

  // If the request was EIP712 and it was successful, it could be we added support for a new signature on the server but not on the client.
  // In this case, show unknown signature instead of error.
  if(method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
    return <UnknownEIP712Signature />;
  }

  // Catch all, no known response from server.
  return <UnknownError id={response.id} message={`Unkown Response Type '${response.type}'`} />;
}

export function Reverted({ message }: { message?: string }) {
  return (
    <Infographic
      image={brokenRobot}
      alt="broken robot"
      title={
        <div className="text-base text-gray-300">
          Simulation shows <span className="inline text-gray-100">this transaction will fail </span>{" "}
          and cause lost of gas fees
        </div>
      }
      description={
        (message && (
          <div className="w-full pt-4 text-base text-gray-300">Failure reason: {message}</div>
        )) ||
        "Unkown Failure Reason"
      }
    />
  );
}

export function Assets({ response }: { response: ServerResponse }) {
  return (
    <div className="flex w-full grow flex-col items-center">
      <div className="flex w-full flex-col gap-4 bg-gray-900 py-2 pb-4">
        <Alerts alerts={response.alerts} />
        <ContractDetails toAddressInfo={response.to} />
      </div>
      <div className="flex w-full grow flex-col">
        <AssetChanges assets={response.assetChanges} />
      </div>
    </div>
  );
}

/// Single Pending Transaction View
export function HashPersonalSign() {
  return (
    <Infographic
      image={hashPersonalSign}
      alt="unknown box"
      title="This signature cannot be translated"
      description={
        <div>
          {" "}
          Only sign if you trust it <br /> <br />
          Note: if you &apos;re on X2Y2.io, you&apos;ll see this for listing assets.
        </div>
      }
    />
  );
}

export function SafePersonalSign() {
  return (
    <Infographic
      image={safePersonalSign}
      alt="fingerprint"
      title={<div className="text-green-500">Signing in</div>}
      description="This type of signature is not able to move your assets and is usually used for signing in"
    />
  );
}

export function UnknownEIP712Signature() {
  return (
    <Infographic
      image={unknownEIP712}
      alt="unknown galaxy"
      title="Unsupported Project"
      description="Let us know if you want to have this project's signature added!"
    />
  );
}

export function EthSign() {
  return (
    <Infographic
      image={highWarning}
      alt="warning"
      title="This signature is dangerous and can result in the loss of all your assets"
      description="This is an outdated type of signature that is no longer used for safety reasons"
    />
  );
}

export function BlurBulk({ hostname }: { hostname: string }) {
  if (hostname != "blur.io") {
    return (
      <Infographic
        image={highWarning}
        alt="warning"
        title="This is a Blur signature not on Blur.io!"
        description="This signature can move your assets. It looks like it's not coming from the official blur.io website. This is likely a scam, please be careful."
      />
    );
  } else {
    return (
      <Infographic
        image={blurLogo}
        alt="blur logo"
        title="This Blur signature can move your assets but cannot be translated."
        description="Please make sure you're on the official blur website."
      />
    );
  }
}

export function CollabLand({ user, community }: { user?: string; community?: string }) {
  return (
    <Infographic
      image={collabland}
      alt="collabland logo"
      title="Verifying ownership with Collab.Land"
      description={
        <div>
          {user && (
            <div className="w-full pt-4 text-base text-gray-100">
              Hi {user}.<div>Welcome to {community}.</div>
              <br />
              <br />
            </div>
          )}
          This is a read-only signature that cannot move your assets.
        </div>
      }
    />
  );
}

export function ContractDetails({ toAddressInfo }: { toAddressInfo: ToAddressInfo }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-center text-base">
      <div className="text-xl font-light text-gray-300"> {toAddressInfo.description} </div>
      {toAddressInfo.info && (
        <div className="my-auto inline-flex gap-x-1 text-2xl text-gray-100 text-gray-100">
          {toAddressInfo.info.name}
          <div className="my-auto text-blue-400">
            <svg
              className="my-auto h-5 w-5 fill-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              height="48"
              viewBox="0 96 960 960"
              width="48">
              <path d="m332 972-62-106-124-25q-11-2-18.5-12t-5.5-21l14-120-79-92q-8-8-8-20t8-20l79-91-14-120q-2-11 5.5-21t18.5-12l124-25 62-107q6-10 17-14t22 1l109 51 109-51q11-5 22-1.5t17 13.5l63 108 123 25q11 2 18.5 12t5.5 21l-14 120 79 91q8 8 8 20t-8 20l-79 92 14 120q2 11-5.5 21T814 841l-123 25-63 107q-6 10-17 13.5t-22-1.5l-109-51-109 51q-11 5-22 1t-17-14Zm105-349-73-76q-9-10-22-10t-23 9q-10 10-10 23t10 23l97 96q9 9 21 9t21-9l183-182q9-9 9-22t-10-22q-9-8-21.5-7.5T598 463L437 623Z" />
            </svg>
          </div>
        </div>
      )}
      <AddressComponent address={toAddressInfo.address} url={toAddressInfo.etherscanUrl} />
    </div>
  );
}

export function Alerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length == 0) {
    return null;
  }

  let high_alert_component = null;

  // Only display a single high alert.
  const high_alert = alerts.find((alert) => alert.severity === "High");

  if (high_alert) {
    high_alert_component = (
      <div className="flex flex-col items-center justify-center border-b-2 border-gray-800 py-2 text-center text-base">
        <img src={highWarning} className="h-24" alt="high severity warning" />
        <div className="px-8">{high_alert.msg}</div>
        {high_alert.secondary_msg && (
          <div className="px-8 text-gray-300">{high_alert.secondary_msg}</div>
        )}
      </div>
    );
  }

  // Display all the medium alerts.
  const medium_alerts = alerts.filter((alert) => alert.severity === "Medium");
  const medium_alert_component = medium_alerts.map((alert, index) => (
    <div
      key={index}
      className="flex flex-col items-center justify-center border-b-2 py-2 border-gray-800 text-center text-base">
      <div className="flex flex-row">
        <img src={mediumWarning} className="my-auto mr-2 h-6" alt="medium severity warning" />
        <div>{alert.msg}</div>
      </div>
      {alert.secondary_msg && <div className="px-8 text-gray-300">{alert.secondary_msg}</div>}
    </div>
  ));

  // Display both if it's relevant.
  return (
    <div>
      {high_alert && high_alert_component}
      {medium_alerts.length != 0 && medium_alert_component}
    </div>
  );
}

export function AddressComponent({ address, url }: { address: string; url: string }) {
  const posthog = usePostHog();

  const checksumAddress = utils.getAddress(address);
  const COPY_TEXT = "Copy to clipboard";
  const COPIED_TEXT = "Copied!";
  const [copyText, setCopyText] = useState(COPY_TEXT);
  return (
    <div className="flex flex-row items-center gap-x-2 py-1">
      <Tooltip id="clipboard" />
      <button
        data-tooltip-id="clipboard"
        data-tooltip-content={copyText}
        data-tooltip-place="bottom"
        className="flex flex-row rounded-lg border border-gray-500 p-1 px-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
        onClick={() => {
          navigator.clipboard.writeText(checksumAddress || "");
          setCopyText(COPIED_TEXT);

          posthog?.capture("Copied Address");

          // Revert after 2 second.
          setTimeout(() => {
            setCopyText(COPY_TEXT);
          }, 2000);
        }}>
        <div className="w-24">
          {checksumAddress.substring(0, 6)}...
          {checksumAddress.substring(checksumAddress.length - 4)}
        </div>
        <div className="my-auto pl-2">
          <AiFillCopy />
        </div>
      </button>
      <a
        href={url}
        target="_blank"
        onClick={() => {
          posthog?.capture("Etherscan Clicked");
        }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 122 122"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M25.29 57.9139C25.2901 57.2347 25.4244 56.5623 25.6851 55.9352C25.9458 55.308 26.3278 54.7386 26.8092 54.2595C27.2907 53.7804 27.8619 53.4011 28.4903 53.1434C29.1187 52.8858 29.7918 52.7548 30.471 52.7579L39.061 52.7859C40.4305 52.7859 41.744 53.33 42.7124 54.2984C43.6809 55.2669 44.225 56.5803 44.225 57.9499V90.4299C45.192 90.1429 46.434 89.8369 47.793 89.5169C48.737 89.2952 49.5783 88.761 50.1805 88.0009C50.7826 87.2409 51.1102 86.2996 51.11 85.3299V45.0399C51.11 43.6702 51.654 42.3567 52.6224 41.3881C53.5908 40.4195 54.9043 39.8752 56.274 39.8749H64.881C66.2506 39.8752 67.5641 40.4195 68.5325 41.3881C69.5009 42.3567 70.045 43.6702 70.045 45.0399V82.4329C70.045 82.4329 72.2 81.5609 74.299 80.6749C75.0787 80.3452 75.7441 79.7931 76.2122 79.0877C76.6803 78.3822 76.9302 77.5545 76.931 76.7079V32.1299C76.931 30.7605 77.4749 29.4472 78.4431 28.4788C79.4113 27.5103 80.7245 26.9662 82.0939 26.9659H90.701C92.0706 26.9659 93.384 27.51 94.3525 28.4784C95.3209 29.4468 95.865 30.7603 95.865 32.1299V68.8389C103.327 63.4309 110.889 56.9269 116.89 49.1059C117.761 47.9707 118.337 46.6377 118.567 45.2257C118.797 43.8138 118.674 42.3668 118.209 41.0139C115.431 33.0217 111.016 25.6973 105.245 19.5096C99.474 13.3218 92.4749 8.40687 84.6955 5.07934C76.9161 1.75182 68.5277 0.0849617 60.0671 0.185439C51.6065 0.285917 43.2601 2.15152 35.562 5.66286C27.8638 9.17419 20.9834 14.2539 15.3611 20.577C9.73881 26.9001 5.49842 34.3272 2.91131 42.3832C0.324207 50.4391 -0.552649 58.9464 0.336851 67.3607C1.22635 75.775 3.86263 83.911 8.07696 91.2479C8.81111 92.5135 9.89118 93.5434 11.1903 94.2165C12.4894 94.8896 13.9536 95.178 15.411 95.0479C17.039 94.9049 19.066 94.7019 21.476 94.4189C22.5251 94.2998 23.4937 93.7989 24.1972 93.0116C24.9008 92.2244 25.2901 91.2058 25.291 90.1499L25.29 57.9139Z"
            fill="white"
          />
          <path
            d="M25.1021 110.009C34.1744 116.609 44.8959 120.571 56.0802 121.456C67.2646 122.34 78.4757 120.114 88.4731 115.022C98.4705 109.93 106.864 102.172 112.726 92.6059C118.587 83.0395 121.688 72.0381 121.685 60.8188C121.685 59.4188 121.62 58.0337 121.527 56.6567C99.308 89.7947 58.2831 105.287 25.104 110.004"
            fill="#8B8B8B"
          />
        </svg>
      </a>
    </div>
  );
}

export function AssetChanges({ assets }: { assets: AssetChangeArg[] }) {
  if (assets.length == 0) {
    return (
      <ShadowTextBox>
        <div className="self-center pt-4 text-2xl text-gray-100">No change in assets</div>
      </ShadowTextBox>
    );
  }

  return (
    <ShadowTextBox>
      {assets.map((asset, index) => (
        <AssetChange key={index} asset={asset} />
      ))}
    </ShadowTextBox>
  );
}

export function AssetChange({ asset }: { asset: AssetChangeArg }) {
  return (
    <div className="flex w-full items-center gap-2">
      <a
        className="flex grow items-center gap-2 hover:underline"
        target="_blank"
        href={asset.metadata.url}
        rel="noreferrer">
        <div className="w-16 flex-shrink-0">
          <img src={asset.metadata.icon} className="h-16 w-16 object-contain" alt="token image" />{" "}
        </div>
        <div className="text-base font-medium text-gray-100">
          <div className="flex flex-col">
            <div className="inline-flex">
              {asset.metadata.name}
              {asset.metadata.verified && (
                <span className="my-auto inline pl-1 text-blue-400">
                  <svg
                    className="my-auto h-4 w-4 fill-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    height="48"
                    viewBox="0 96 960 960"
                    width="48">
                    <path d="m332 972-62-106-124-25q-11-2-18.5-12t-5.5-21l14-120-79-92q-8-8-8-20t8-20l79-91-14-120q-2-11 5.5-21t18.5-12l124-25 62-107q6-10 17-14t22 1l109 51 109-51q11-5 22-1.5t17 13.5l63 108 123 25q11 2 18.5 12t5.5 21l-14 120 79 91q8 8 8 20t-8 20l-79 92 14 120q2 11-5.5 21T814 841l-123 25-63 107q-6 10-17 13.5t-22-1.5l-109-51-109 51q-11 5-22 1t-17-14Zm105-349-73-76q-9-10-22-10t-23 9q-10 10-10 23t10 23l97 96q9 9 21 9t21-9l183-182q9-9 9-22t-10-22q-9-8-21.5-7.5T598 463L437 623Z" />
                  </svg>
                </span>
              )}
            </div>
            <div className="w-32 truncate text-sm text-gray-300">
              {asset.metadata.secondaryLine}
            </div>
          </div>
        </div>
      </a>
      <div
        className={classNames("flex flex-wrap justify-self-end pl-2 text-right text-base", {
          "text-red-500": asset.color === "red",
          "text-green-500": asset.color === "green",
          "text-gray-100": asset.color === "white"
        })}>
        {asset.action}
      </div>
    </div>
  );
}
