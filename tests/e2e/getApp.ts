import { resolve } from 'app-root-path';
import { Application } from 'spectron';

export default () =>
  new Application({
    path: resolve(
      './node_modules/.bin/electron' +
        (process.platform === 'win32' ? '.cmd' : '')
    ),
    args: [resolve('.')],
    startTimeout: 10000,
    waitTimeout: 10000,
    env: {
      ELECTRON_IS_DEV: '0'
    }
  });
