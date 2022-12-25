/// Storage wrapper for updating the storage.
import logger from './logger';
import { fetchSimulate, fetchSignature } from './server';
import type { RequestArgs } from './request';
import { Simulation, Response, ResponseType } from '../lib/models';
import browser from 'webextension-polyfill';

const log = logger.child({ component: 'Storage' });
export enum StoredSimulationState {
  // Currently in the process of simulating.
  Simulating = 'Simulating',

  // Reverted or invalid signature processing.
  Revert = 'Revert',

  // Error
  Error = 'Error',

  // Successful simulation
  Success = 'Success',

  // User has rejected.
  Rejected = 'Reject',

  // User has requested we keep going. This could be confirming or skipping.
  Confirmed = 'Confirm',
}

export enum StoredType {
  Simulation,
  Signature,
  SignatureHash,
  PersonalSign,
}

export interface StoredSimulation {
  id: string;

  /// Signer who initiated this signature.
  signer: string;

  /// Type of request.
  type: StoredType;

  /// The state this simulation is in.
  state: StoredSimulationState;

  /// Simulation set on success.
  simulation?: Simulation;

  /// Optional error message on Error
  error?: string;
}

/**
 * Location where we store StoredSimulation[]
 */
export const STORAGE_KEY = 'simulations';

export const addSimulation = async (simulation: StoredSimulation) => {
  const { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ old: simulations, new: simulation }, 'Adding simulation');

  // Add new simulation to the front.
  simulations.push({ ...simulation });

  return browser.storage.local.set({ simulations });
};

const completeSimulation = async (id: string, simulation: Simulation) => {
  const { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ old: simulations, new: simulation }, 'Completing simulation');

  simulations.forEach((storedSimulation: StoredSimulation) => {
    if (storedSimulation.id === id) {
      log.debug('Simulation found id', id);
      storedSimulation.state = StoredSimulationState.Success;
      storedSimulation.simulation = simulation;
    }
  });

  return browser.storage.local.set({ simulations });
};

// Skip the popup, this is used for incorrect chain id.
export const skipSimulation = async (id: string) => {
  const { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ id }, 'Skipping simulation');

  simulations.forEach((storedSimulation: StoredSimulation) => {
    if (storedSimulation.id === id) {
      log.debug('Simulation found id', id);
      storedSimulation.state = StoredSimulationState.Confirmed;
    }
  });

  return browser.storage.local.set({ simulations });
}

const revertSimulation = async (id: string, error?: string) => {
  const { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ old: simulations, error }, 'Simulation reverted');

  simulations.forEach((storedSimulation: StoredSimulation) => {
    if (storedSimulation.id === id) {
      log.debug('Simulation found id', id);
      storedSimulation.state = StoredSimulationState.Revert;
      storedSimulation.error = error;
    }
  });

  return browser.storage.local.set({ simulations });
};

export const removeSimulation = async (id: string) => {
  let { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ old: simulations, id }, 'Removing simulation');

  simulations = simulations.filter((storedSimulation: StoredSimulation) => {
    return storedSimulation.id !== id;
  });

  return browser.storage.local.set({ simulations });
};

export const updateSimulationState = async (
  id: string,
  state: StoredSimulationState
) => {
  let { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ id, state }, 'Update simulation');

  simulations = simulations.map((x: StoredSimulation) =>
    x.id === id
      ? {
        ...x,
        state,
      }
      : x
  );

  return browser.storage.local.set({ simulations });
};

// TODO(jqphu): dedup with above...
const updateSimulatioWithErrorMsg = async (id: string, error?: string) => {
  let { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info({ id, error }, 'Update simulation with error msg');

  simulations = simulations.map((x: StoredSimulation) =>
    x.id === id
      ? {
        ...x,
        error,
        state: StoredSimulationState.Error,
      }
      : x
  );

  return browser.storage.local.set({ simulations });
};

export const fetchSimulationAndUpdate = async (args: RequestArgs) => {
  log.info(args, 'Fetch simulation and update');
  let response: Response;

  let state = StoredSimulationState.Simulating;
  if (args.chainId !== "0x1" && args.chainId !== "1") {
    // Automatically confirm if chain id is incorrect. This prevents the popup.
    state = StoredSimulationState.Confirmed;
  }

  if ('transaction' in args) {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        signer: args.signer,
        type: StoredType.Simulation,
        state,
      }),
      fetchSimulate(args),
    ]);

    response = result[1];
  } else if ('hash' in args) {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        signer: args.signer,
        type: StoredType.SignatureHash,
        state,
      }),
      fetchSignature(args),
    ]);

    response = result[1];
  } else if ('signMessage' in args) {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        signer: args.signer,
        type: StoredType.PersonalSign,
        state,
      }),
      fetchSignature(args),
    ]);

    response = result[1];
  } else {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        signer: args.signer,
        type: StoredType.Signature,
        state,
      }),
      fetchSignature(args),
    ]);

    response = result[1];
  }

  if (response.type === ResponseType.Error) {
    log.info(response, 'Response error');
    if (response?.error === 'invalid chain id') {
      // This will likely be a no-op but we want to handle it anyway.
      return skipSimulation(args.id);
    } else {
      return updateSimulatioWithErrorMsg(args.id, response.error);
    }
  }
  if (response.type === ResponseType.Revert) {
    log.info(response, 'Reverted simulation');
    return revertSimulation(args.id, response.error);
  }
  if (response.type === ResponseType.Success) {
    log.info(response, 'Response success');
    if (!response.simulation) {
      throw new Error('Invalid state');
    }

    return completeSimulation(args.id, response.simulation);
  }
};

export const clearOldSimulations = async () => {
  let { simulations = [] } = await browser.storage.local.get(STORAGE_KEY);
  log.info(simulations, 'Clear old simulations');

  // Remove confirmed/rejected simulations.
  simulations = simulations.filter(
    (x: StoredSimulation) =>
      x.state !== StoredSimulationState.Rejected &&
      x.state !== StoredSimulationState.Confirmed
  );

  return browser.storage.local.set({ simulations });
};

// NOTE: be cautious changing this variable. We need to update the variables in setSettings and getSettings if we do.
// TODO(jqphu): fix this.
export const SETTINGS_KEY = 'pocket_universe_settings';

export interface Settings {
  /**
   * Whether or not we should disable the extension.
   */
  disable: boolean;

  /**
   * Whether or not we should ignore popups for purchases on opensea.
   */
  hyperdrive: boolean;
}

const updateIcon = (settings: Settings) => {
  // Depending if we are on MV3 or MV2.
  const action = browser.action || browser.browserAction;
  if (settings.disable) {
    action.setIcon({ path: 'icon-32-gray.png' });
  } else {
    action.setIcon({ path: 'icon-32.png' });
  }
};

/**
 * Set the settings to the given args.
 *
 * We can pass either disable or hyperdrive.
 *
 * We'll set which ever field is set.
 */
export const setSettings = async (args: {
  disable?: boolean;
  hyperdrive?: boolean;
}) => {
  // Default is enabled.
  let { pocket_universe_settings = { disable: false, hyperdrive: false } } =
    await browser.storage.local.get(SETTINGS_KEY);
  log.info({
    settings: pocket_universe_settings,
    args,
    msg: 'Updating settings',
  });

  if (args.disable !== undefined) {
    pocket_universe_settings.disable = args.disable;
  }

  if (args.hyperdrive !== undefined) {
    pocket_universe_settings.hyperdrive = args.hyperdrive;
  }

  updateIcon(pocket_universe_settings);

  return browser.storage.local.set({
    [SETTINGS_KEY]: pocket_universe_settings,
  });
};

/**
 * Get the settings.
 */
export const getSettings = async (): Promise<Settings> => {
  const { pocket_universe_settings = { disable: false, hyperdrive: false } } =
    await browser.storage.local.get(SETTINGS_KEY);

  return pocket_universe_settings as Settings;
};

/**
 * Get the initial set of settings for the icon.
 *
 * This should only run in settings and not in the content scripts as browser.action is not available there.
 */
if (browser.action || browser.browserAction) {
  getSettings().then(updateIcon);
}

export const simulationNeedsAction = (
  state: StoredSimulationState
): boolean => {
  return (
    state === StoredSimulationState.Success ||
    state === StoredSimulationState.Error ||
    state === StoredSimulationState.Simulating ||
    state === StoredSimulationState.Revert
  );
};

// TODO(jqphu): make this into an object
export const UPDATE_KEY = 'updates';
export const UPDATE_MESSAGE_KEY = 'updates_message';
export const UPDATE_LINK_KEY = 'updates_link';
