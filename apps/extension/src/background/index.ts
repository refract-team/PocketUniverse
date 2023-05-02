import { logBackground as log } from "~utils/log";
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.PLASMO_PUBLIC_SENTRY_DSN
});

// On install open new onboarding.
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://www.pocketuniverse.app/onboarding' });
  }
});

/// Add a quick form for uninstalls to see if we can improve the product on uninstall.
chrome.runtime.setUninstallURL('https://forms.gle/YNRYTWWJRQnA99qV9');

import "./router";

log.info("Background Script Starting");

export {};
