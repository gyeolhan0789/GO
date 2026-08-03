import http from 'k6/http';
import { check } from 'k6';

let accountCounter = 0;

export function signupAndLogin(baseUrl) {
  const seq = accountCounter++;
  const suffix = `${__VU}-${Date.now()}-${seq}`;
  const email = `k6-${suffix}@k6.local`;
  const password = 'Test1234!';

  // 닉네임은 2~10자 제한이라 VU/호출순번을 base36으로 압축해 담는다.
  // (VU-타임스탬프 문자열을 그냥 slice(0, 10)으로 자르면 밀리초 단위로 바뀌는
  // 뒷자리가 잘려나가 짧은 시간 내 여러 계정을 만들 때 닉네임이 충돌했다(409))
  const ts36 = Date.now().toString(36).slice(-4);
  const vu36 = (__VU % 1296).toString(36).padStart(2, '0');
  const seq36 = (seq % 1296).toString(36).padStart(2, '0');
  const nickname = `k6${ts36}${vu36}${seq36}`;

  http.post(
    `${baseUrl}/auth/signup`,
    JSON.stringify({
      email,
      password,
      nickname,
      region: 'SEOUL',
      gender: 'MALE',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginRes = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, { '로그인 성공': (r) => r.status === 200 });
  return loginRes.json('accessToken');
}

// 모듈 스코프 변수는 VU별로 독립된 인스턴스를 가지며 iteration 간에 유지된다.
// VU당 회원가입/로그인은 최초 1회만 하고, 이후 iteration은 캐시된 토큰을 재사용한다.
let cachedToken = null;

export function getAuthToken(baseUrl) {
  if (!cachedToken) {
    cachedToken = signupAndLogin(baseUrl);
  }
  return cachedToken;
}
