import logger from '../../lib/logger';
import type { SimulateRequestArgs } from '../../lib/simulate_request_reply';
import {
  listenToSimulateRequest,
  dispatchSimulateResponse,
  SIMULATE_REQUEST_COMMAND,
  SimulateResponse,
} from '../../lib/simulate_request_reply';
import type { StoredSimulation } from '../../lib/storage';
import { removeSimulation, StoredSimulationState } from '../../lib/storage';

const log = logger.child({ component: 'Content-Script' });
console.log('Content Script Loaded');

// There is a bit of a memory leak here. If the user navigates away from this page before the request is sent in, the request will never be removed from storage.
// There shouldn't be too many requests though so this is okay.

/// TODO(jqphu): de-dup this with the code in the injected script.
let ids: string[] = [];

const maybeRemoveId = (id: string) => {
  log.debug('Maybe removing id', id);
  if (ids.includes(id)) {
    log.debug('RemovingId', id);
    ids = ids.filter((thisId) => thisId !== id);
    removeSimulation(id);
  }
};

listenToSimulateRequest((simulateRequest: SimulateRequestArgs) => {
  log.info({ simulateRequest }, 'SimulateRequest');
  ids.push(simulateRequest.id);

  // Page has sent an event, start listening to storage changes.
  // This ensures we don't listen to storage changes on every singel webpage.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.simulations?.newValue) {
      const newSimulations = changes.simulations.newValue;
      log.info(newSimulations, 'Dispatching new values for simulation');

      // Note: this will dispatch to **all** content pages.
      // To address this later we can generate a random id for each page. Append it to the request.
      // Either way, this should be pretty cheap. It's just DOM communication.
      // TODO(jqphu): measure & generate random id's so we don't dispatch so many events.
      newSimulations.forEach((simulation: StoredSimulation) => {
        // Either dispatch the corresponding event, or push the item to new simulations.
        if (simulation.state === StoredSimulationState.Confirmed) {
          log.debug('Dispatch confirmed', simulation.id);
          dispatchSimulateResponse({
            id: simulation.id,
            type: SimulateResponse.Continue,
          });
          maybeRemoveId(simulation.id);
        } else if (simulation.state === StoredSimulationState.Rejected) {
          log.debug('Dispatch rejected', simulation.id);
          dispatchSimulateResponse({
            id: simulation.id,
            type: SimulateResponse.Reject,
          });
          maybeRemoveId(simulation.id);
        }
      });
    }
  });

  chrome.runtime.sendMessage({
    command: SIMULATE_REQUEST_COMMAND,
    data: simulateRequest,
  });
});
