import config from '../config';
import { setSettings } from './storage'

const AUTH_SERVER_URL = config.authServer;

/**
 * Update the premium status.
 *
 * This will retrieve whether they are premium. If premium is enabled we will
 * keep the hyperdrive settings as is.
 *
 * If premium is not enabled, we will turn off hyperdrive in the storage.
 *
 * We should be able to run this function at any time since if they're logged
 * in it should be stored in the cookies.
 *
 * This function will return the premium result.
 *
 * TODO(jqphu): This function name is not descriptive. It updates hyperdrive
 * but is not clear from the function name.
 */
export const updatePremiumStatus = async () => {
  return fetch(`${AUTH_SERVER_URL}/api/premium`).then(async (result) => {
    const session = await result.json();

    // If we don't have a session, or the user is not premium.
    if (!session || !session.premium) {
      // Turn off hyperdrive, they're not logged in.
      //
      // This should not be flaky, since the user is persistently logged in.
      setSettings({ hyperdrive: false });
    }

    return session;
  })
}
