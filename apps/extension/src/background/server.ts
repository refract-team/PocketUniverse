import type { RequestArguments, ServerRequestBase } from "~types";
import { ServerRequest, ServerResponse } from "~types";
import type { ServerRequest as ServerRequestType } from "~types";
import { logServer as log } from "~utils/log";
import * as Sentry from "@sentry/browser";

const SERVER_URL = process.env.PLASMO_PUBLIC_SERVER_URL;

/// Covert from RequestArguments to something that is understood by our servers.
const toServerArgs = (base: ServerRequestBase, args: RequestArguments) => {
  switch (args.method) {
    case "eth_sendTransaction": {
      let transaction = args.params[0];

      // We set these explicitly because if the user sets `null` as fields it
      // doesn't get set to the default value in zod.
      transaction.value = transaction.value || "0x0";
      transaction.data = transaction.data || "0x";


      // Both typesafety and validation. Probably overkill.
      const server_request: ServerRequestType = {
        ...base,
        signer: args.signer,
        args: {
          method: "eth_sendTransaction",
          transaction,
        }
      };

      log.info(`Attempting to parse ${JSON.stringify(server_request, null, 2)}`);

      return ServerRequest.parse(server_request);
    }
    case "personal_sign": {
      // The first, second address are either the message or the signer. They can be flipped depending on what method is called.
      const [first, second] = args.params as string[];

      let message: string;
      if (String(first).replace(/0x/, "").length === 40) {
        message = second;
      } else {
        message = first;
      }

      // Both typesafety and validation. Probably overkill.
      const server_request: ServerRequestType = {
        ...base,
        signer: args.signer,
        args: {
          method: "personal_sign",
          message
        }
      };

      log.info(`Attempting to parse ${JSON.stringify(server_request, null, 2)}`);

      return ServerRequest.parse(server_request);
    }
    case "eth_signTypedData":
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      // Both typesafety and validation. Probably overkill.
      const server_request: ServerRequestType = {
        ...base,
        signer: args.signer,
        args: {
          method: "eth_signTypedData",
          data: JSON.parse(args.params[1])
        }
      };

      log.info(`Attempting to parse ${JSON.stringify(server_request, null, 2)}`);

      return ServerRequest.parse(server_request);
    }
    case "eth_sign": {
      const server_request: ServerRequestType = {
        ...base,
        signer: args.signer,
        args: {
          method: "eth_sign"
        }
      };

      log.info(`Attempting to parse ${JSON.stringify(server_request, null, 2)}`);

      return ServerRequest.parse(server_request);
    }
    default:
      throw new Error("unsupported");
  }
};

const request = async (base: ServerRequestBase, args: RequestArguments) => {
  log.info(
    `Server request base: ${JSON.stringify(base, null, 2)} args: ${JSON.stringify(args, null, 2)}`
  );

  let serverArgs: ServerRequest;
  try {
    serverArgs = toServerArgs(base, args);
  } catch (e) {
    log.warn(`Parsing failed with error ${e}`);

    // Capture we failed to parse args.
    Sentry.captureEvent({
      message: "Parsing error",
      level: "error",
      extra: {
        base: JSON.stringify(base, null, 2),
        args: JSON.stringify(args, null, 2),
      }
    });

    return {
      error: true,
      message: "Failed to parse request args"
    };
  }

  log.info(`Parsed args ${JSON.stringify(serverArgs, null, 2)}`);

  const response = await fetch(`${SERVER_URL}/request`, {
    method: "POST",
    body: JSON.stringify(serverArgs),
    headers: {
      "Content-Type": "application/json"
    }
  });

  log.info(`Got response code ${JSON.stringify(response.status, null, 2)}`);

  if (response.status == 200) {
    // TODO(jqphu): retries.
    const result = await response.json();

    log.info(`Got response ${JSON.stringify(result, null, 2)}`);

    return ServerResponse.parse(result);
  } else {
    log.warn(
      `Invalid response status (${response.status}) with messagge '${
        response?.statusText
      }' for request ${JSON.stringify(serverArgs)}`
    );

    let optional_json_message = null;
    if (response.status === 500) {
      try {
        optional_json_message = (await response.json()).message;
      } catch {
        // Skip, not JSON or no message field.
      }
    }

    // Capture the server errors the client is receieving.
    Sentry.captureEvent({
      message: `API error - ${response.status}: ${response.statusText}`,
      level: "error",
      extra: {
        status: response.status,
        message: optional_json_message,
        args: JSON.stringify(serverArgs, null, 2)
      }
    });

    return {
      error: true,
      message: optional_json_message || `Code: ${response.status} Message: ${response?.statusText}`
    };
  }
};

export { request };
