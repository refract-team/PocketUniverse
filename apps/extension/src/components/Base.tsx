import * as Sentry from "@sentry/react";
import { POCKET_ID, extensionStore } from "~utils/extension-store";
import type { PostHog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

Sentry.init({
  dsn: process.env.PLASMO_PUBLIC_SENTRY_DSN
});

export const POSTHOG_API_KEY = process.env.PLASMO_PUBLIC_POSTHOG_KEY;
export const POSTHOG_OPTIONS = {
  api_host: "https://app.posthog.com",
  // Don't capture all events by default.
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,

  // Chrome extensions have some issues storing locally.
  persistence: "localStorage" as const,
  loaded: (posthog: PostHog) => {
    // Set the extensionId to access from background script.
    const distinct_id = posthog.get_distinct_id();
    extensionStore.set(POCKET_ID, distinct_id);
  }
};

import "~/styles/style.css";
import type { PropsWithChildren } from "react";

function Base({ children }: PropsWithChildren) {
  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={POSTHOG_OPTIONS}>
      {children}
    </PostHogProvider>
  );
}

export default Base;
