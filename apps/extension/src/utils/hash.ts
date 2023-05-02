import type { RequestArguments } from "~types";
import hash from "object-hash";

// Hash a given request.
//
// This will determine if a request is identical.
//
// NOTE: We ignore the signer for this hash. Identical is the arguments, chain
// and request origin. We care about whether it's a provider or websocket
// request as someone could fake a websocket request and then send it directly
// to the MM provider. This shouldn't matter anyway.
export const hashRequest = (data: RequestArguments) => {
  return hash({ chainId: data.chainId, method: data.method, params: data.params, options: data.options });
};
