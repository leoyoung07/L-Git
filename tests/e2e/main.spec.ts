import { Application } from 'spectron';
import getApp from './getApp';

let app: Application;

jest.setTimeout(300000);

afterEach(async () => {
  if (app && app.isRunning()) {
    return await app.stop();
  }
});
beforeEach(async () => {
  app = getApp();
  await app.start();
  await app.client.waitUntilWindowLoaded();
});

describe('Main Test', async () => {
  it('Application should have a title', async () => {
    expect(await app.client.getTitle()).toBe('L-Git');
  });
  it('Root div should be visible', async () => {
    expect(await app.client.isVisible('div#root')).toBe(true);
  });
});
