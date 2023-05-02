import { z } from "zod";

import { Address } from "./address";

export const Transaction = z.object({
  from: Address,
  to: Address,

  // Hex string.
  value: z.string().default("0x0"),

  // Optional data.
  data: z.string().default("0x"),

  // Take a number, which may be string or integer.
  gas: z.coerce.number().optional(),

  // Hex string
  //
  // TODO(jqphu); create hex string in zod.
  gasPrice: z.string().optional()
});

export type Transaction = z.infer<typeof Transaction>;
