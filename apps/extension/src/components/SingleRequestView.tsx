import { RejectContinue } from "~components/RejectContinue";
import type { State } from "~types";
import { StateKind } from "~types";

import { ActionRequired } from "./ActionRequired";
import { Pending } from "./Pending";

/// Single Pending Transaction View
export function SingleRequestView({ request }: { request: State }) {
  return (
    <div className="flex w-full grow flex-col">
      {/* Body view, taking up most of the screen */}
      <div className="flex grow flex-col">
        <Body request={request} />
      </div>
      {/* Stick the reject/continue to the bottom */}
      <div className="sticky bottom-0 h-20 bg-gray-900">
        <RejectContinue request={request} />
      </div>
    </div>
  );
}

export function Body({ request }: { request: State }) {
  switch (request.state) {
    case StateKind.Pending:
      return <Pending />;
    case StateKind.ActionRequired:
      return <ActionRequired request={request} />;
    default:
      return <div> Unknown </div>;
  }
}
