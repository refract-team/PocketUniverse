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
}

export interface StoredSimulation {
  id: string;

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

  if ('transaction' in args) {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        type: StoredType.Simulation,
        state: StoredSimulationState.Simulating,
      }),
      fetchSimulate(args),
    ]);

    response = result[1];
  } else if ('hash' in args) {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        type: StoredType.SignatureHash,
        state: StoredSimulationState.Simulating,
      }),
      fetchSignature(args),
    ]);

    response = result[1];
  } else {
    const result = await Promise.all([
      addSimulation({
        id: args.id,
        type: StoredType.Signature,
        state: StoredSimulationState.Simulating,
      }),
      fetchSignature(args),
    ]);

    response = result[1];
  }

  if (response.type === ResponseType.Error) {
    log.info(response, 'Response error');
    return updateSimulatioWithErrorMsg(args.id, response.error);
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

export const SETTINGS_KEY = 'settings';

export interface Settings {
  /**
   * Whether or not we should disable the extension.
   */
  disable: boolean;
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
 */
export const setSettings = async (args: Settings) => {
  // Default is enabled.
  let { settings = { disable: false } } = await browser.storage.sync.get(
    SETTINGS_KEY
  );
  log.info({ settings: settings, msg: 'Updating settings' });

  settings.disable = args.disable;

  updateIcon(settings);

  return browser.storage.sync.set({ settings });
};

/**
 * Get the settings.
 */
export const getSettings = async (): Promise<Settings> => {
  const { settings = { disable: false } } = await browser.storage.sync.get(
    SETTINGS_KEY
  );
  log.info({ settings: settings, msg: 'Getting settings.' });

  return settings as Settings;
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
