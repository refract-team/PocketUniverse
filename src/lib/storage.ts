/// Storage wrapper for updating the storage.
import logger from './logger';
import { fetchSimulate } from './server';
import type { SimulateRequestArgs } from './simulate_request_reply';
import { Simulation, ResponseType } from '../lib/models';

const log = logger.child({ component: 'Storage' });
export enum StoredSimulationState {
  // Currently in the process of simulating.
  Simulating = 'Simulating',

  // Reverted
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

export interface StoredSimulation {
  id: string;

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
  const { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  log.info({ old: simulations, new: simulation }, 'Adding simulation');

  // Add new simulation to the front.
  simulations.push({ ...simulation });

  return chrome.storage.sync.set({ simulations });
};

const completeSimulation = async (id: string, simulation: Simulation) => {
  const { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  log.info({ old: simulations, new: simulation }, 'Completing simulation');

  simulations.forEach((storedSimulation: StoredSimulation) => {
    if (storedSimulation.id === id) {
      log.debug('Simulation found id', id);
      storedSimulation.state = StoredSimulationState.Success;
      storedSimulation.simulation = simulation;
    }
  });

  return chrome.storage.sync.set({ simulations });
};

const revertSimulation = async (id: string, error?: string) => {
  const { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  log.info({ old: simulations, error }, 'Simulation reverted');

  simulations.forEach((storedSimulation: StoredSimulation) => {
    if (storedSimulation.id === id) {
      log.debug('Simulation found id', id);
      storedSimulation.state = StoredSimulationState.Revert;
      storedSimulation.error = error;
    }
  });

  return chrome.storage.sync.set({ simulations });
};

export const removeSimulation = async (id: string) => {
  let { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  log.info({ old: simulations, id }, 'Removing simulation');

  simulations = simulations.filter((storedSimulation: StoredSimulation) => {
    return storedSimulation.id !== id;
  });

  return chrome.storage.sync.set({ simulations });
};

export const updateSimulationState = async (
  id: string,
  state: StoredSimulationState
) => {
  let { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  log.info({ id, state }, 'Update simulation');

  simulations = simulations.map((x: StoredSimulation) =>
    x.id === id
      ? {
        ...x,
        state,
      }
      : x
  );

  return chrome.storage.sync.set({ simulations });
};

// TODO(jqphu): dedup with above...
const updateSimulatioWithErrorMsg = async (id: string, error?: string) => {
  let { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
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

  return chrome.storage.sync.set({ simulations });
};

export const fetchSimulationAndUpdate = async (
  simulateArgs: SimulateRequestArgs
) => {
  log.info(simulateArgs, 'Fetch simulation and update');
  // Add a pending simulation, and shoot of a request at the same time.
  const [, response] = await Promise.all([
    addSimulation({
      id: simulateArgs.id,
      state: StoredSimulationState.Simulating,
    }),
    fetchSimulate(simulateArgs),
  ]);

  if (response.type === ResponseType.Error) {
    log.info(response, 'Response error');
    return updateSimulatioWithErrorMsg(simulateArgs.id, response.error);
  }
  if (response.type === ResponseType.Revert) {
    log.info(response, 'Reverted simulation');
    return revertSimulation(simulateArgs.id, response.error);
  }
  if (response.type === ResponseType.Success) {
    log.info(response, 'Response success');
    if (!response.simulation) {
      throw new Error('Invalid state');
    }
    return completeSimulation(simulateArgs.id, response.simulation);
  }
};

export const clearOldSimulations = async () => {
  let { simulations = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  log.info(simulations, 'Clear old simulations');

  // Remove confirmed/rejected simulations.
  simulations = simulations.filter(
    (x: StoredSimulation) =>
      x.state !== StoredSimulationState.Rejected &&
      x.state !== StoredSimulationState.Confirmed
  );

  return chrome.storage.sync.set({ simulations });
};

export const SETTINGS_KEY = 'settings';

export interface Settings {
  /**
   * Whether or not we should disable the extension.
   */
  disable: boolean;
}

const updateIcon = (settings: Settings) => {
  if (settings.disable) {
    chrome.action.setIcon({ path: 'icon-32-gray.png' });
  } else {
    chrome.action.setIcon({ path: 'icon-32.png' });
  }
};

/**
 * Set the settings to the given args.
 */
export const setSettings = async (args: Settings) => {
  // Default is enabled.
  let { settings = { disable: false } } = await chrome.storage.sync.get(
    SETTINGS_KEY
  );
  log.info({ settings: settings, msg: 'Updating settings' });

  settings.disable = args.disable;

  updateIcon(settings);

  return chrome.storage.sync.set({ settings });
};

/**
 * Get the settings.
 */
export const getSettings = async (): Promise<Settings> => {
  const { settings = { disable: false } } = await chrome.storage.sync.get(
    SETTINGS_KEY
  );
  log.info({ settings: settings, msg: 'Getting settings.' });

  return settings as Settings;
};

/**
 * Get the initial set of settings for the icon.
 *
 * This should only run in settings and not in the content scripts as chrome.action is not available there.
 */
if (chrome.action) {
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
