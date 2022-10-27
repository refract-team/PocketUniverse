interface Config {
  dev: boolean;
  server: string;
  logLevel: string;
}

const config: Config = { dev: false, server: '', logLevel: 'debug' };

// Changable Configurations //

const dev = true;

// Set of constants //

const DEV_SERVER = 'https://pocketsimulator.app/v1';
const PROD_SERVER = 'https://pocketsimulator.app/v1';

config.dev = dev;

if (dev) {
  config.logLevel = 'debug';
  config.server = DEV_SERVER;
} else {
  config.logLevel = 'warn';
  config.server = PROD_SERVER;
}

export default config;
