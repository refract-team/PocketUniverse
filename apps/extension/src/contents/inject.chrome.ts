import type { PlasmoCSConfig } from "plasmo";
import { logContentScript as log } from "~utils/log";
import "~inject";

log.debug("CHROME: Starting inject main content-script");

// Need to guarantee we run at document start.
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_start",
  world: "MAIN"
};
