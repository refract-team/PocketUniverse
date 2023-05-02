import { logInjected as log } from "~utils/log";
import { ContentSender, InjectedReceiver } from "~utils/request";

declare global {
  interface Window {
    refract: any;
  }
}

// Initialize here so there's only one shared across provider and websocket.
//
// Just initialized to listen, unused.
new InjectedReceiver({
  health: async (name: string) => `hello ${name} from injected`
});

window.refract = {};

// Requests to the content script.
window.refract.contentSender = new ContentSender();

// Import the provider to be injected.
import "./provider.ts";

// Import the replaced websocket for wallet connect
import "./websocket.ts";

log.debug("Starting injected script");

export {};
