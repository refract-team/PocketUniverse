/// Reject and Continue component.
///
/// Component is responsible for routing the request to the wallet, or rejecting it and updating the storage.

import { ethErrors } from "eth-rpc-errors";

import { setAction } from "~utils/extension-store";
import type { Alert, State } from "~types";
import { Action, StateKind } from "~types";
import clsx from "clsx";
import { usePostHog } from "posthog-js/react";

export function RejectContinue({ request }: { request: State }) {
  const posthog = usePostHog();

  let shouldDangerousContinue = false;
  if (request.state == StateKind.ActionRequired && "success" in request.response) {
    const high_alert = request.response.success.alerts?.find(
      (alert: Alert) => alert.severity === "High"
    );
    if (high_alert) {
      shouldDangerousContinue = true;
    }
  }

  // EthSign is also dangerous.
  shouldDangerousContinue = shouldDangerousContinue || request.request.method == "eth_sign";

  // TODO(jqphu): on error, you can't press any buttons.
  return (
    <div className="flex h-full justify-center items-center">
      <button
        type="button"
        className="mx-8 inline-flex h-12 w-36 items-center justify-center rounded rounded-lg border border-transparent bg-white text-base font-bold text-gray-900 drop-shadow-xl"
        onClick={async () => {
          await setAction(
            request.id,
            Action.Reject,
            // Based on EIP-1103
            ethErrors.provider.userRejectedRequest(
              "PocketUniverse Tx Signature: User denied transaction signature."
            )
          );

          posthog?.capture("reject", { dangerous: shouldDangerousContinue, request });
          // Don't need this window anymore, we're done.
          window.close();
        }}>
        Reject
      </button>
      <button
        type="button"
        className={clsx(
          "gray-50 bg-primary-500 mx-8 inline-flex h-12 w-36 items-center justify-center rounded rounded-lg border border-transparent text-base font-bold drop-shadow-xl",
          {
            "bg-red-500": shouldDangerousContinue
          }
        )}
        onClick={async () => {
          // Blindly forward the result back to the website (to show reject ActionRequiredor confirm).
          await setAction(request.id, Action.Resolve);

          posthog?.capture("continue", { dangerous: shouldDangerousContinue, request });

          // Action resolved done.
          window.close();
        }}>
        Continue
      </button>
    </div>
  );
}
