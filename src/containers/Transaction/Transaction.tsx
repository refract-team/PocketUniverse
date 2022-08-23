import * as Sentry from '@sentry/react';
import { utils, BigNumber } from 'ethers';
import mixpanel from 'mixpanel-browser';
import React from 'react';
import { MdVerified } from 'react-icons/md';
import { BeatLoader } from 'react-spinners';
import { useChromeStorageSync } from 'use-chrome-storage';

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
import verifiedContracts from '../../lib/verified_contracts.json';

// List of verified contracts.
// Map from contract to name.
const VERIFIED_CONTRACTS = new Map(Object.entries(verifiedContracts));

const log = logger.child({ component: 'Popup' });

Sentry.init({
  dsn: 'https://e130c8dff39e464bab4c609c460068b0@o1317041.ingest.sentry.io/6569982',
});

mixpanel.init('00d3b8bc7c620587ecb1439557401a87');

const NoTransactionComponent = () => {
  return (
    <div className="text-lg text-center p-5">
      <img className="m-auto w-32" src="rocket.png" alt="rocket taking off" />
      <div className="p-2 text-gray-100">
        Trigger a transaction to get started.
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
          {event.tokenType === TokenType.ERC721 ? 'NFT' : event.name}
        </div>
      );
    }
    if (event.type === EventType.Approval) {
      return (
        <div className="text-red-500 text-base text-right ml-auto my-auto">
          Permission to withdraw{' '}
          {event.tokenType !== TokenType.ERC721 &&
            `${formattedAmount} ${event.name}`}
        </div>
      );
    }
    if (event.type === EventType.ApprovalForAll) {
      const isWhitelisted =
        event.toAddress && VERIFIED_CONTRACTS.has(event.toAddress);
      const color = isWhitelisted ? 'text-orange-400' : 'text-red-500';

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
        <div className="text-base text-gray-100 m-auto">
          {event.name || 'Unknown Name'}
        </div>
        <div className="m-auto">
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
}: {
  simulation: Simulation;
  type: StoredType;
}) => {
  const events = simulation.events;

  if (type === StoredType.Simulation) {
    const NoApprovalForAll = (
      <div className="text-base text-gray-400 pb-4">
        Changes being made in this transaction
      </div>
    );

    // Should be protected against this, no events should show no change in assets.
    if (events.length === 0) {
      return null;
    }

    const event = events[0];

    if (event.type === EventType.ApprovalForAll) {
      if (event.toAddress && VERIFIED_CONTRACTS.has(event.toAddress)) {
        // Set ApprovalForAll but keep going.
        return (
          <div>
            <div className="flex flex-row text-base justify-center text-gray-100 text-center pb-2">
              <div>
                Giving approval to {VERIFIED_CONTRACTS.get(event.toAddress)}
              </div>
              <div className="my-auto pl-1 text-lg text-blue-300">
                <MdVerified />
              </div>
            </div>
          </div>
        );
      }

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

    if (simulation.verifiedAddressName) {
      return (
        <>
          <div>
            <div className="flex flex-col text-base text-gray-400 gap-2 justify-center items-center">
              You are interacting with
              <div className="flex flex-row text-base justify-center text-gray-100 text-center pb-2">
                {simulation.verifiedAddressName}
                <div className="my-auto pl-1 text-blue-300">
                  <MdVerified />
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    return NoApprovalForAll;
  } else {
    const PotentialChangesMessage = (
      <div className="text-base text-gray-400 pb-4">
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
                Please make sure this is not a scam!
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
  id,
  state,
}: {
  id: string;
  state: StoredSimulationState;
}) => {
  if (simulationNeedsAction(state)) {
    return (
      <div className="flex flex-row space-x-16 p-4 justify-center">
        <button
          className="text-base bg-gray-600 hover:bg-gray-400 text-white w-28 py-2 rounded-full"
          onClick={() => {
            mixpanel.track('Simulation Rejected', {
              id,
              state,
            });
            log.info({ id, state }, 'Simulation Rejected');
            updateSimulationState(id, StoredSimulationState.Rejected);
          }}
        >
          Reject
        </button>
        <button
          className="text-base bg-gray-100 hover:bg-gray-300 text-black w-28 rounded-full"
          onClick={() => {
            mixpanel.track('Simulation Continue', {
              id,
              state,
            });
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
            We could not decode the message.
            Let us know in Discord if you would like us to support this website/protocol.
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

  if (storedSimulation.state === StoredSimulationState.Success) {
    return (
      <div className="flex flex-col grow items-center justify-center w-full">
        <PotentialWarnings
          simulation={simulation}
          type={storedSimulation.type}
        />

        <div className="m-2 border-y border-gray-600 w-full w-11/12">
          <SimulationComponent simulation={simulation} />
        </div>
      </div>
    );
  }

  return null;
};

const TransactionComponent = () => {
  // TODO(jqphu): handle errors?
  // Storage mapping to StoredSimulation[]
  const [storedSimulations] = useChromeStorageSync(STORAGE_KEY, []);

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
          {filteredSimulations.length} queued
        </div>
      )}
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
            id={filteredSimulations[0].id}
            state={filteredSimulations[0].state}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionComponent;
