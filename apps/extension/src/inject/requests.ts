import { ContentSender, InjectedReceiver } from "~utils/request";
import {logInjected as log} from "~utils/log";

log.info("Shared request handler loaded.");

// Initialize a receiver to listen to events.
//
// Just initialized to listen, unused.
new InjectedReceiver({
  health: async (name: string) => `hello ${name} from injected`
});

// Requests to the content script.
const contentSender = new ContentSender();

export {contentSender};
