import type { RequestArguments } from "~types";

const extractPersonalSignArgs = (args: RequestArguments) => {
  if (args.method != "personal_sign") {
    throw new Error(
      `Cannot extract personal sign from non-personal sign method ${JSON.stringify(args, null, 2)}`
    );
  }

  // The first, second address are either the message or the signer. They can be flipped depending on what method is called.
  const [first, second] = args.params as string[];

  let address: string;
  let msg: string;
  if (String(first).replace(/0x/, "").length === 40) {
    address = first;
    msg = second;
  } else {
    msg = first;
    address = second;
  }

  return { address, msg };
};

export { extractPersonalSignArgs };
