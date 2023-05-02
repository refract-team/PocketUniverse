import { utils } from "ethers";
import { z } from "zod";

/// Zod type that will validate a Ethereum Address (in any case) and return it in checksum case
export const Address = z
  .string()
  .refine(utils.isAddress, (val) => ({
    message: `${val} is not a valid ethereum address`
  }))
  .transform(utils.getAddress);

export type Address = z.infer<typeof Address>;
