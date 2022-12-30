import * as Sentry from '@sentry/react';
import { utils, BigNumber } from 'ethers';
import React from 'react';
import { MdVerified, MdIosShare } from 'react-icons/md';
import { AiFillCopy } from 'react-icons/ai';
import { BeatLoader } from 'react-spinners';
import { useState, useEffect } from 'react';
import ReactTooltip from 'react-tooltip';
import posthog from 'posthog-js';
import browser from 'webextension-polyfill';

import logger from '../../lib/logger';
import { Simulation, Event, EventType, TokenType } from '../../lib/models';
import type { StoredSimulation } from '../../lib/storage';
import { StoredType } from '../../lib/storage';
import {
  STORAGE_KEY,
  simulationNeedsAction,
  StoredSimulationState,
  updateSimulationState,
} from '../../lib/storage';

const log = logger.child({ component: 'Popup' });

Sentry.init({
  dsn: 'https://e130c8dff39e464bab4c609c460068b0@o1317041.ingest.sentry.io/6569982',
});

posthog.init('phc_XmauXFN8C70Ty226giVZgohSLWQHAECtwupYpYzNkMM', { api_host: 'https://app.posthog.com', autocapture: false, capture_pageview: false });

const NoTransactionComponent = () => {
  return (
    <div className="text-lg text-center">
      <img className="m-auto w-32" src="rocket.png" alt="rocket taking off" />
      <div className="flex flex-col gap-4">
      <div className="p-2 text-gray-100">
        Trigger an Ethereum transaction to start
      </div>
      <div className="p-2 text-base text-gray-100">
        We currently only work on Ethereum Mainnet. You will not see a pop-up for other chains.
      </div>

      <div className="p-2 text-base text-gray-100">
      Come chat with us in  <a
                    href="https://discord.gg/nVdz8tKkBr"
                    target="_blank"
                    className="text-purple-300 text-base hover:underline inline"
                    rel="noreferrer"
                    >
                    Discord
                    </a> if you want help!
      </div>
      </div>
    </div>
  );
};

/**
 * Pass in a hex string, get out the parsed amount.
 *
 * If the amount is undefined or null, the return will be 1.
 */
const getFormattedAmount = (
  amount: string | null,
  decimals: number | null
): string => {
  if (!amount) {
    return '1';
  }

  if (!decimals) {
    decimals = 0;
  }

  if (amount === '0x') {
    return '0';
  }

  const amountParsed = BigNumber.from(amount);

  // We're okay to round here a little bit since we're just formatting.
  const amountAsFloatEther = parseFloat(
    utils.formatUnits(amountParsed, decimals)
  );

  let formattedAmount;

  if (amountAsFloatEther > 1 && amountAsFloatEther % 1 !== 0) {
    // Add 4 decimals if it is > 1
    formattedAmount = amountAsFloatEther.toFixed(4);
  } else {
    // Add precision of 4.
    formattedAmount = amountAsFloatEther.toLocaleString('fullwide', {
      useGrouping: false,
      maximumSignificantDigits: 4,
    });
  }

  return formattedAmount;
};

const EventComponent = ({ event }: { event: Event }) => {
  const formattedAmount = getFormattedAmount(event.amount, event.decimals);
  const message = () => {
    if (
      event.type === EventType.TransferIn ||
      event.type === EventType.TransferOut
    ) {
      return (
        <div
          className={`${event.type === EventType.TransferIn
            ? 'text-green-500'
            : 'text-red-500'
            } ml-auto my-auto text-lg`}
        >
          {event.type === EventType.TransferIn ? '+' : '-'}
          {formattedAmount}{' '}
          {(event.tokenType === TokenType.ERC721 || event.tokenType === TokenType.ERC1155) ? 'NFT' : event.name}
        </div>
      );
    }
    if (event.type === EventType.Approval) {
      const color = event.verifiedAddressName
        ? 'text-gray-100'
        : 'text-red-500';
      return (
        <div className={`${color} text-base text-right ml-auto my-auto`}>
          Permission to withdraw{' '}
          {event.tokenType !== TokenType.ERC721 &&
            `${formattedAmount} ${event.name}`}
        </div>
      );
    }
    if (event.type === EventType.ApprovalForAll) {
      const color = event.verifiedAddressName
        ? 'text-gray-100'
        : 'text-red-500';

      return (
        <div className={`${color} ml-auto my-auto text-base text-right`}>
          <div>Can withdraw </div>
          {event.tokenType === TokenType.ERC721 ? (
            <div>
              <span className="font-bold underline">ALL NFTs</span>{' '}
              <span>from {event.name}.</span>
            </div>
          ) : (
            <div>
              <span className="font-bold underline">
                ALL {event.name} tokens.
              </span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="flex gap-x-2">
      <a
        className={`flex gap-x-2 ${event.collection_url ? 'hover:underline' : ''
          }`}
        href={event.collection_url}
        target="_blank"
        rel="noreferrer"
      >
        <img
          className="m-auto"
          src={event.image || 'unknown.png'}
          alt="token"
          width="48"
          height="48"
        />
        <div className="text-base text-gray-100 my-auto">
          {event.name || 'Unknown Name'}
        </div>
        <div className="my-auto">
          {event.verified && (
            <div className="my-auto text-lg text-blue-300">
              <MdVerified />
            </div>
          )}
        </div>
      </a>
      {message()}
    </div>
  );
};

const PotentialWarnings = ({
  simulation,
  type,
  verified,
}: {
  simulation: Simulation;
  type: StoredType;
  verified: boolean;
}) => {
  const events = simulation.events;

  // Should be protected against this, no events should show no change in assets.
  if (events.length === 0) {
    return null;
  }

  const event = events[0];

  if (type === StoredType.Simulation) {
    const NoApprovalForAll = (
      <div className="text-base text-center text-gray-400 pb-4 px-2">
        Changes being made in this transaction
      </div>
    );

    // Show the warning for non-verified addresses.
    if (event.type === EventType.ApprovalForAll && !verified) {
      return (
        <div className="flex flex-col justify-center">
          <div className="text-center text-lg font-bold text-red-500">
            🚨 WARNING 🚨
          </div>
          <div className="text-sm px-4 py-2 text-red-500 text-center">
            You are giving approval to withdraw all.
            <div className="font-bold">
              Please make sure it is not a wallet drainer.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        {simulation.mustWarn && (
          <div className="flex flex-col justify-center">
            <div className="text-center text-lg font-bold text-red-500">
              🚨 WARNING 🚨
            </div>
            <div className="text-sm px-4 py-2 text-red-500 text-center">
              <div className="font-bold">{simulation.mustWarnMessage}</div>
            </div>
          </div>
        )}
        <div>{NoApprovalForAll}</div>
      </div>
    );
  } else {
    const PotentialChangesMessage = (
      <div className="text-base text-center text-gray-400 pb-4 px-2">
        Changes that can be made by signing this message
      </div>
    );

    return (
      <div>
        {simulation.shouldWarn && (
          <div className="flex flex-col justify-center">
            <div className="text-center text-lg font-bold text-red-500">
              🚨 WARNING 🚨
            </div>
            <div className="text-sm px-4 py-2 text-red-500 text-center">
              <div className="font-bold">
                {simulation.mustWarnMessage ||
                  'Please make sure this is not a scam!'}
              </div>
            </div>
          </div>
        )}
        <div>{PotentialChangesMessage}</div>
      </div>
    );
  }
};

const SimulationComponent = ({ simulation }: { simulation: Simulation }) => {
  const simulationEvents = () => {
    if (simulation.events.length === 0) {
      return (
        <div className="flex flex-col p-5 gap-4 text-center text-xl w-full">
          No changes in assets found!
        </div>
      );
    }
    return (
      <div className="flex flex-col p-5 gap-4 w-full">
        {simulation.events.map((event: any, index: number) => {
          return <EventComponent key={`${index}`} event={event} />;
        })}
      </div>
    );
  };

  return <div className="self-start w-full">{simulationEvents()}</div>;
};

const ConfirmSimulationButton = ({
  storedSimulation
}: {
  storedSimulation: StoredSimulation;
}) => {
    const {
        id,
        signer,
        state
      } = storedSimulation;

  if (simulationNeedsAction(state)) {
    return (
      <div className="flex flex-row space-x-16 p-4 justify-center">
        <button
          className="text-base bg-gray-600 hover:bg-gray-400 text-white w-28 py-2 rounded-full"
          onClick={() => {
            posthog.alias(signer);
            posthog.capture('simulation rejected', storedSimulation);
            log.info({ id, state }, 'Simulation Rejected');
            updateSimulationState(id, StoredSimulationState.Rejected);
          }}
        >
          Reject
        </button>
        <button
          className="text-base bg-gray-100 hover:bg-gray-300 text-black w-28 rounded-full"
          onClick={() => {
            posthog.alias(signer);
            posthog.capture('simulation confirmed', storedSimulation);
            log.info({ id, state }, 'Simulation Continue');
            updateSimulationState(id, StoredSimulationState.Confirmed);
          }}
        >
          {state === StoredSimulationState.Success ||
            state === StoredSimulationState.Revert
            ? 'Continue'
            : 'Skip'}
        </button>
      </div>
    );
  }
  return null;
};

const StoredSimulationComponent = ({
  storedSimulation,
}: {
  storedSimulation: StoredSimulation;
}) => {
  const COPY_TEXT = 'Copy to clipboard';
  const COPIED_TEXT = 'Copied!';
  const [copyText, setCopyText] = useState(COPY_TEXT);
  if (storedSimulation.state === StoredSimulationState.Simulating) {
    return (
      <div className="flex flex-col grow justify-center items-center w-full">
        <img className="w-32" src="robot.png" alt="robot" />
        <div className="flex flex-col justify-center items-center">
          <BeatLoader className="m-auto" color="purple" />
          <div className="text-white text-lg pt-2">Simulating</div>
        </div>
      </div>
    );
  }

  if (
    storedSimulation.state === StoredSimulationState.Revert &&
    storedSimulation?.type === StoredType.Signature
  ) {
    return (
      <div className="flex flex-col grow justify-center items-center w-11/12">
        <img className="w-48" src="failed.png" alt="failed" />
        <div className="text-gray-300 text-center text-base p-2">
          <div className="text-lg text-orange-400 p-4">
            Please make sure you trust this website before continuing.
          </div>
          <div>
            We could not decode the message. Let us know in Discord if you would
            like us to support this website/protocol.
          </div>
        </div>
      </div>
    );
  }

  if (storedSimulation.state === StoredSimulationState.Revert) {
    return (
      <div className="flex flex-col grow justify-center items-center w-11/12">
        <img className="w-48" src="failed.png" alt="failed" />
        <div className="text-gray-300 text-center text-base p-2">
          <div>
            Simulation shows the transaction will fail
            {storedSimulation.error &&
              ` with message ${JSON.stringify(
                storedSimulation.error,
                null,
                2
              )}.`}
          </div>
        </div>
      </div>
    );
  }

  if (storedSimulation.state === StoredSimulationState.Error) {
    return (
      <div className="flex flex-col grow justify-center items-center w-11/12">
        <img className="w-32" src="glass.png" alt="failure" />
        <div className="text-gray-300 text-center text-base p-2">
          <div>
            Simulation could not be ran{' '}
            {storedSimulation.error &&
              `with message ${JSON.stringify(
                storedSimulation.error,
                null,
                2
              )}.`}
          </div>

          <div>
            Please contact the team for support (id: {storedSimulation.id}).
          </div>
        </div>
      </div>
    );
  }

  // Re-hydrate the functions.
  const simulation = Simulation.fromJSON(storedSimulation.simulation);

  let toAddress = simulation.toAddress;
  let verifiedAddressName = simulation.verifiedAddressName;
  let interactionText = 'Interacting with';

  let approval = false;

  for (const event of simulation.events) {
    // Approval + ApprovalForAll we don't care about the interacting contract, rather we only care about the toAddress.
    //
    // There should only be 1 of these events.
    if (
      event.type === EventType.Approval ||
      event.type === EventType.ApprovalForAll
    ) {
      approval = true;
      interactionText = 'Giving approval to';
      toAddress = event.toAddress;
      verifiedAddressName = event.verifiedAddressName;
    }
  }

  // toAddress must always be set for non signature simulations.
  const interactingAddress = () => {
    // Don't show anything for non-approval signatures.
    // That is we still show permits and who it is to.
    if (!approval && storedSimulation.type === StoredType.Signature) {
      return null;
    }

    return (
      <div className="flex flex-col items-center justify-center w-full text-base text-gray-400 pb-4">
        <div className="my-auto text-gray-400">{interactionText}</div>
        {verifiedAddressName && (
          <div className="flex flex-row text-lg justify-center text-gray-100 text-center my-auto">
            <div className="p-1">{verifiedAddressName}</div>
            <div className="my-auto text-blue-300">
              <MdVerified />
            </div>
          </div>
        )}
        <button
          data-tip=""
          data-for="clipboard"
          className="text-sm flex flex-row border border-gray-600 rounded-lg text-gray-100 p-0.5 px-1 hover:bg-gray-700"
          onClick={() => {
            navigator.clipboard.writeText(toAddress || '');
            setCopyText(COPIED_TEXT);

            // Revert after 2 second.
            setTimeout(() => {
              setCopyText(COPY_TEXT);
            }, 2000);
          }}
        >
          <ReactTooltip
            id="clipboard"
            effect="solid"
            place="bottom"
            getContent={() => copyText}
          />
          <div className="truncate w-24">{toAddress}</div>
          <div className="my-auto pl-0.5">
            <AiFillCopy />
          </div>
        </button>
      </div>
    );
  };

  if (storedSimulation.state === StoredSimulationState.Success) {
    if (storedSimulation.type === StoredType.SignatureHash) {
      return (
        <div className="flex flex-col grow items-center justify-center pt-4 w-full">
          <div className="text-center text-lg font-bold text-red-500">
            🚨 WARNING 🚨
          </div>
          <div className="text-base px-6 py-2 text-red-500 text-center">
            Confirming this signature can transfer all your NFTs or Tokens!
            <div className="text-sm px-6 py-2 text-gray-400 text-center">
              This is very dangerous and is likely a scam. Please triple check
              to ensure you trust this website.
            </div>
          </div>
        </div>
      );
    } else if (storedSimulation.type === StoredType.PersonalSign) {
      if (storedSimulation.simulation?.mustWarn) {
      return (
        <div className="flex flex-col grow items-center justify-center pt-4 w-full">
          <img className="w-48" src="unknown-box.png" alt="unknown-box" />
          <div className="text-base px-6 py-2 text-center">
            This signature cannot be translated. Please be careful.
          </div>
          <div className="text-sm text-gray-300 px-6 py-2 text-center">
            Note: if you're on X2Y2.io, you'll see this for listing assets. This is safe.
          </div>
          <div className="text-sm text-gray-300 px-6 text-center">
          See more info about these signatures <a
                    href="https://twitter.com/PocketUniverseZ/status/1604373525610999808"
                    target="_blank"
                    className="text-purple-300 hover:underline inline"
                    rel="noreferrer"
                    >
                    here
                    </a>
          </div>
        </div>
      );
      } else {
      return (
        <div className="flex flex-col grow items-center justify-center pt-4 gap-4 w-full">
          <div className="text-center text-xl text-green-400">
            Sign In
          </div>
          <img className="w-48" src="sign-in-image.png" alt="sign-in-image" />
          <div className="text-base px-6 py-2 text-center">
            This is a safe signature which cannot move your assets. It's usually used for signing in.
          </div>
        </div>
      );
        }
    } else {
      // TODO: handle the TO address separately.
      return (
        <div className="flex flex-col grow items-center justify-center pt-4 w-full">
          {interactingAddress()}
          <div className="flex flex-col grow items-center justify-center w-full">
            <PotentialWarnings
              simulation={simulation}
              type={storedSimulation.type}
              verified={verifiedAddressName !== undefined}
            />

            <div className="m-2 border-y border-gray-600 w-full w-11/12">
              <SimulationComponent simulation={simulation} />
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

const TransactionComponent = () => {
  // TODO(jqphu): handle errors?
  // Storage mapping to StoredSimulation[]
  const [storedSimulations, setStoredSimulations] = useState<
    StoredSimulation[]
  >([]);

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEY).then(({ simulations }) => {
      setStoredSimulations(simulations);
    });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]?.newValue) {
        const newSimulations = changes[STORAGE_KEY]?.newValue;
        setStoredSimulations(newSimulations);
      }
    });
  }, []);

  const filteredSimulations = storedSimulations?.filter(
    (simulation: StoredSimulation) =>
      simulation.state !== StoredSimulationState.Rejected &&
      simulation.state !== StoredSimulationState.Confirmed
  );

  if (!filteredSimulations || filteredSimulations.length === 0) {
    return (
      <div className="flex flex-col w-full">
        <div>
          <img
            className="w-full border-t border-gray-600"
            src="waves_top.png "
            alt=""
          />
        </div>
        <div className="flex grow justify-center items-center w-full">
          <NoTransactionComponent />
        </div>
        <div>
          <img className="mt-auto w-full" src="waves_bottom.png" alt="" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between w-full">
      {filteredSimulations.length !== 1 && (
        <div className="p-2 text-base flex items-center justify-center text-gray-400 border-t border-gray-600 w-full">
          {filteredSimulations.length - 1} queued
        </div>
      )}
      <div className="absolute flex w-full justify-end py-6 px-6">
        <a href="https://twitter.com/intent/tweet?text=X%20looks%20like%20a%20scam%21%0A%0ADetected%20by%20%40PocketUniverseZ%0A%0A---%28delete%20below%20before%20posting%29---%0AInclude%20a%20screenshot%20in%20your%20post%21%0A%E2%97%86%20Shift%20%2B%20Command%20%2B%204%20%28Mac%29%0A%E2%97%86%20Windows%20key%20%2B%20Shift%20%2B%20S%20%28Windows%29" target="_blank">
          <button onClick={() => {
            posthog.capture('click share')
          }}title="share on twitter" className="flex flex-col items-center text-gray-300 hover:text-gray-400 ">
            <MdIosShare size={24} />
          </button>
        </a>
      </div>

      <img
        className="w-full border-t border-gray-600"
        src="waves_top.png"
        alt=""
      />
      <div className="flex flex-col grow w-full justify-center items-center">
        <StoredSimulationComponent
          key={filteredSimulations[0].id}
          storedSimulation={filteredSimulations[0]}
        />
        <img className="mt-auto w-full" src="waves_bottom.png" alt="" />
        <div className="mt-auto border-t border-gray-600 w-full">
          <ConfirmSimulationButton
            storedSimulation={filteredSimulations[0]}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionComponent;
