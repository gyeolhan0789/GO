/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { getCurrentCoords } from '../src/shared/lib/geolocation';
import {
  getWalkTrackingRoute,
  subscribeWalkTrackingRoute,
} from '../src/shared/lib/walkTracking';
import { useRouteTracking } from '../src/screens/WalkSessionScreen/hooks/useRouteTracking';

jest.mock('../src/shared/lib/geolocation', () => ({
  getCurrentCoords: jest.fn(),
}));

jest.mock('../src/shared/lib/walkTracking', () => ({
  getWalkTrackingRoute: jest.fn(),
  subscribeWalkTrackingRoute: jest.fn(),
}));

const mockedGetCurrentCoords = jest.mocked(getCurrentCoords);
const mockedGetWalkTrackingRoute = jest.mocked(getWalkTrackingRoute);
const mockedSubscribeWalkTrackingRoute = jest.mocked(subscribeWalkTrackingRoute);

function RouteTrackingHarness() {
  useRouteTracking();
  return null;
}

describe('산책 경로 위치 준비', () => {
  beforeEach(() => {
    mockedGetCurrentCoords.mockReturnValue(new Promise(() => {}));
    mockedGetWalkTrackingRoute.mockResolvedValue([]);
    mockedSubscribeWalkTrackingRoute.mockReturnValue(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('화면 진입 시 빠른 위치 조회와 고정밀 GPS 예열을 함께 시작한다', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<RouteTrackingHarness />);
    });

    expect(mockedGetCurrentCoords).toHaveBeenNthCalledWith(1);
    expect(mockedGetCurrentCoords).toHaveBeenNthCalledWith(2, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    act(() => renderer!.unmount());
  });
});
