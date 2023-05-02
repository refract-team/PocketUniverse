import type { PlasmoCSConfig } from "plasmo";
import { logContentScript as log } from "~utils/log";
import injectedScript from "url:~inject";

log.debug("FIREFOX: Starting inject main content-script");

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: true
};


// Firefox does not contain registerContentScript
// We inject directly into the main world.
var s = document.createElement('script');
// This should intentionally fail on chrome as we inject the script in the background file.
s.src = injectedScript;
(document.head || document.documentElement).appendChild(s);
s.onload = () => {
  s.remove();
};
