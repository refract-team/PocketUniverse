import { z } from "zod";

export const Alert = z.object({
  // Manually change this to any string, this allows us to update warnings and
  // alerts without having a specific type.
  kind:z.string().describe("Alert we detected."),
  msg: z.string().describe("Human readable message."),
  secondary_msg: z
    .union([
      z.string().describe("Additional secondary information that is useful to display."),
      z.null().describe("Additional secondary information that is useful to display.")
    ])
    .describe("Additional secondary information that is useful to display.")
    .optional(),
  severity: z.enum(["High", "Medium", "Low"])
});

export const AssetChange = z
  .object({
    action: z.string(),
    color: z.enum(["red", "white", "green"]).describe("A single asset that is changing."),
    metadata: z
      .object({
        icon: z.string(),
        name: z.string(),
        secondaryLine: z.union([z.string(), z.null()]).optional(),
        url: z.union([z.string(), z.null()]).optional(),
        verified: z.boolean()
      })
      .describe("All the metadata for this asset change.")
  })
  .describe("A single asset that is changing.");

export const ToAddressInfo = z
  .object({
    address: z.string().describe("Ethereum address in hex prefixed with 0x."),
    description: z.string(),
    etherscanUrl: z
      .string()
      .describe("URL for etherscan\n\nDifferent for each chain."),
    info: z
      .union([
        z
          .object({
            name: z
              .string()
              .describe(
                "Name of the address.\n\ne.g. OpenSea, Uniswap, USDC etc."
              ),
            verified: z
              .boolean()
              .describe(
                "Whether this address is known safe address.\n\nCurrently always set to true. In the future, this may be set to false and more information about the address will be returned (such as deployment date / first transaction date)."
              ),
          })
          .describe("Information about a known safe address."),
        z.null(),
      ])
      .optional(),
  })
  .describe(
    "This is either the contract we're interacting with, or the address we're giving approval to."
  );
 
export const ServerResponse = z
  .object({
    chainId: z.string().describe("Chain to request for."),
    id: z.string().describe("Id for this request."),
    signer: z.string().describe("Signer")
  })
  .and(
    z.any().superRefine((x, ctx) => {
      const schemas = [
        z.object({
          alerts: z.array(Alert).describe("List of alerts."),
          assetChanges: z.array(AssetChange).describe("All the changes to display."),
          to: ToAddressInfo,
          type: z.enum(["assets"])
        }),
        z.object({
          message: z.union([z.string(), z.null()]).optional(),
          type: z.enum(["revertedSimulation"])
        }),
        z.object({
          community: z.union([z.string(), z.null()]).optional(),
          type: z.enum(["collabLand"]),
          user: z.union([z.string(), z.null()]).optional()
        }),
        z.object({ type: z.enum(["safePersonalSign"]) }),
        z.object({ type: z.enum(["hashPersonalSign"]) }),
        z.object({ type: z.enum(["unknownEIP712Signature"]) }),
        z.object({ type: z.enum(["blurBulk"]) }),
        z.object({ type: z.enum(["ethSign"]) }),
      ];
      const errors = schemas.reduce(
        (errors: z.ZodError[], schema) =>
          ((result) => ("error" in result ? [...errors, result.error] : errors))(
            schema.safeParse(x)
          ),
        []
      );
      if (schemas.length - errors.length !== 1) {
        ctx.addIssue({
          path: ctx.path,
          code: "invalid_union",
          unionErrors: errors,
          message: "Invalid input: Should pass single schema"
        });
      }
    }).or(
    // Manually add this to ensure that if more signatures are updated on
    // the server, we just show unknown signature.
    z.object({ type: z.string() })
    )
  )
  .describe("Response");

export type ServerResponse = z.infer<typeof ServerResponse>;
export type ToAddressInfo = z.infer<typeof ToAddressInfo>;
export type AssetChange = z.infer<typeof AssetChange>;
export type Alert = z.infer<typeof Alert>;
