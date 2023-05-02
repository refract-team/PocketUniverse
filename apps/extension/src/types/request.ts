import { z } from "zod";

import { Address } from "./address";

/// Type safe request arguments. This isn't the entire request arguments based on EIP1993 but rather the subset that is sent to the server.
/// Note: eth_signTypedData is used by eth_signTypedData_v3,v4
export const ServerRpcMethods = z.union([
  z.literal("eth_sign"),
  z.literal("eth_sendTransaction"),
  z.literal("personal_sign"),
  z.literal("eth_signTypedData"),
  z.literal("eth_signTypedData_v3"),
  z.literal("eth_signTypedData_v4")
]);

export type ServerRpcMethods = z.infer<typeof ServerRpcMethods>;

// TODO(jqphu): we can make this entire struct type safe in the future.
export const RequestArguments = z.object({
  chainId: z.string(),
  signer: Address,
  method: ServerRpcMethods,
  params: z.union([z.array(z.unknown()), z.record(z.unknown())]).optional(),
  options: z.object({
    // Whether this a websocket request, otherwise it is a provider request.
    websocket: z.boolean().default(false)
  }) 
});

export type RequestArguments = z.infer<typeof RequestArguments>;

export const ServerRequestBase = z.object({
  id: z.string().uuid(),
  chainId: z.string().default("0x1")
});

export type ServerRequestBase = z.infer<typeof ServerRequestBase>;
