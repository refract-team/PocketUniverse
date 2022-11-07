interface Config {
  dev: boolean;
  server: string;
  authServer: string;
  logLevel: string;
}

const config: Config = { dev: false, server: '', authServer: '', logLevel: 'debug' };

// Changable Configurations //

const dev = false;

// Set of constants //

const DEV_SERVER = 'http://localhost:3000';
const PROD_SERVER = 'https://pocketsimulator.app';


const DEV_AUTH_SERVER = 'http://localhost:4000';
const PROD_AUTH_SERVER = 'https://dash.pocketuniverse.app';

config.dev = dev;

if (dev) {
  config.logLevel = 'debug';
  config.server = DEV_SERVER;
  config.authServer = DEV_AUTH_SERVER;
} else {
  config.logLevel = 'warn';
  config.server = PROD_SERVER;
  config.authServer = PROD_AUTH_SERVER;
}

export default config;
