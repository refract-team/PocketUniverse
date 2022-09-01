export let settings = {
  disable: false,
};

const DISPATCH_SETTINGS = 'POCKET_UNIVERSE_DISPATCH_SETTINGS';

/**
 * Dispatch from ContentScript to InjectedScript the new settings.
 */
export const dispatchSettings = (settings: any) => {
  document.dispatchEvent(
    new CustomEvent(DISPATCH_SETTINGS, {
      detail: JSON.stringify(settings),
    })
  );
};

/**
 * Listen to updates in settings.
 */
export const listenForSettingsUpdates = () => {
  document.addEventListener(DISPATCH_SETTINGS, (event: any) => {
    settings = JSON.parse(event.detail);
  });
};
