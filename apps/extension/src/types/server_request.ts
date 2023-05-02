import { z } from "zod";

export const ServerRequest = z.object({
  args: z
    .any()
    .superRefine((x, ctx) => {
      const schemas = [
        z.object({
          method: z.enum(["eth_sendTransaction"]),
          transaction: z
            .object({
              data: z
                .string()
                .default("0x")
                .describe("Data to send.\n\nThis is a byte hex string prefixed with 0x."),
              from: z.string().describe("Address from."),
              to: z.string().describe("Address to."),
              value: z.string().default("0x0").describe("Value to send.")
            })
            .describe("Transaction to be simulated.")
        }),
        z.object({ message: z.string(), method: z.enum(["personal_sign"]) }),
        z.object({ data: z.unknown(), method: z.enum(["eth_signTypedData"]) }),
        z.object({ method: z.enum(["eth_sign"]) })
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
    })
    .describe(
      'Args sent for this request.\n\nWe will use internally tagged representation here. https://serde.rs/enum-representations.html. This will keep it similar to the request on the typescript level.\n\n## Example\n\nEncode args as:\n\n{ method: "eth_sendTransaction", from: Address, to: Address, ... }'
    ),
  chainId: z.string().describe("Chain to request for."),
  id: z.string().describe("Id for this request."),
  signer: z.string().describe("Signer")
});

export type ServerRequest = z.infer<typeof ServerRequest>;
