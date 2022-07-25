import pino from 'pino';

import config from '../config';

const log = pino({
  name: 'PocketUniverse',
  level: config.logLevel,
  browser: {
    asObject: true,
  },
}).child({ name: 'PocketUniverse' });

export default log;
