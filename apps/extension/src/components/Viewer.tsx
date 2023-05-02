import rocketship from "data-base64:~assets/rocketship.png";
import { FaDiscord } from "@react-icons/all-files/fa/FaDiscord";
import { FaTwitter } from "@react-icons/all-files/fa/FaTwitter";

import { ShadowTextBox } from "~components/ShadowTextBox";
import type { State } from "~types";
import { StateKind } from "~types";

import { SingleRequestView } from "./SingleRequestView";

/// Entrypoint for the view.
///
/// TODO(jqphu): this name sucks
///
/// Defualts to empty if no transactions found.
export function Viewer({ request }: { request?: State }) {
  return (
    <div className="flex grow flex-col items-center justify-center">
      {((!request || request.state === StateKind.Completed) && <HomePageNoRequests />) ||
        ((request.state === StateKind.Pending || request.state === StateKind.ActionRequired) && (
          <SingleRequestView key={request.id} request={request} />
        ))}
    </div>
  );
}

export function HomePageNoRequests() {
  return (
    <div className="flex w-full grow flex-col">
      <div className="flex w-full grow flex-col items-center justify-center justify-center gap-5 text-center text-base font-medium">
        <img src={rocketship} alt="rocketship" />
        <div>Trigger a transaction to get started.</div>
        <ShadowTextBox>
          Pocket Universe will pop up automatically for Ethereum and Polygon transactions!
        </ShadowTextBox>
      </div>
      <div className="sticky bottom-0 h-20 bg-gray-900 px-2 py-5">
        <div className="text-primary-300 flex flex-grow items-center justify-center gap-6">
          <a
            href="https://twitter.com/PocketUniverseZ"
            target="_blank"
            className="border-primary-300 inline-flex h-10 w-14 items-center justify-center rounded-lg border bg-gray-800"
            rel="noreferrer">
            <FaTwitter size={24} />
          </a>
          <a
            href="https://discord.com/invite/nVdz8tKkBr"
            target="_blank"
            className="border-primary-300 inline-flex h-10 w-14 items-center justify-center rounded-lg border bg-gray-800"
            rel="noreferrer">
            <FaDiscord size={24} />
          </a>
        </div>
      </div>
    </div>
  );
}
