/* global jest */

const messaging = {};

module.exports = {
  getMessaging: jest.fn(() => messaging),
  getToken: jest.fn(() => Promise.resolve('')),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
};
