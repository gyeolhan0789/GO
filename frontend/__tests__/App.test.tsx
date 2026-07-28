/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';

// 앱은 시작 직후 쿠키의 refreshToken으로 세션 복구를 시도한다. 실제 fetch는
// 네이티브 XHR을 타서 jest에서는 응답이 오지 않으므로 여기서 끊는다. 401은
// 로그인 이력이 없는 첫 실행에 해당한다.
beforeEach(() => {
  installFetchMock().mockResolvedValue(
    jsonResponse(401, { message: '유효하지 않은 Refresh Token입니다.' }),
  );
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
