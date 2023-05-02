import log from "loglevel";

// Add the module name and the level to the log.
const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);

  return function (message) {
    rawMethod(`[${String(loggerName)}|${methodName}]: ${message}`);
  };
};

// Note, we need to call setLevel for the above factory to work. Even if not conditionally logging, remember to keep the setLevel.
if (process.env.NODE_ENV == "development") {
  log.setLevel("debug");
} else {
  log.setLevel("error");
}

const logContentScript = log.getLogger("content-script");
const logBackground = log.getLogger("background");
const logInjected = log.getLogger("injected");
const logTab = log.getLogger("tab");
const logUtil = log.getLogger("utils");
const logAccount = log.getLogger("account");
const logRequestManager = log.getLogger("request-manager");
const logStorage = log.getLogger("storage");
const logServer = log.getLogger("server");

export {
  logContentScript,
  logBackground,
  logTab,
  logInjected,
  logUtil,
  logAccount,
  logRequestManager,
  logStorage,
  logServer
};
