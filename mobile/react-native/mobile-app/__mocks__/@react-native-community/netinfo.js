/**
 * Jest mock for @react-native-community/netinfo.
 * Mirrors the package's shipped jest/netinfo-mock.js shape closely enough for
 * NetworkService: fetch(), addEventListener(), configure().
 */

const defaultState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: { isConnectionExpensive: false, strength: 100 }
};

const listeners = new Set();

const fetch = jest.fn(() => Promise.resolve({ ...defaultState }));

const addEventListener = jest.fn((listener) => {
  listeners.add(listener);
  listener({ ...defaultState });
  return () => listeners.delete(listener);
});

const configure = jest.fn();

// Test helper: push a fake connectivity change to subscribers.
export const __emitNetInfo = (state) => {
  listeners.forEach((l) => l({ ...defaultState, ...state }));
};

export default { fetch, addEventListener, configure };
export { fetch, addEventListener, configure };
