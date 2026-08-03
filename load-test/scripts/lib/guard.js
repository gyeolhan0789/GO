// BASE_URL 허용 범위를 검증한다. scenario.js와 scripts/endpoints/*가 공유한다.
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE_URL);
const isDev = BASE_URL.replace(/\/$/, '') === 'https://i15a506.p.ssafy.io/dev';

if (!isLocal && !isDev) {
  throw new Error(`허용되지 않은 BASE_URL입니다: ${BASE_URL}. 로컬 또는 dev(https://i15a506.p.ssafy.io/dev)만 허용됩니다. (prod 오발사 방지)`);
}
if (isDev && __ENV.CONFIRM_DEV !== 'yes') {
  throw new Error('dev 서버는 팀이 공유하는 자원입니다. 실행하려면 --env CONFIRM_DEV=yes 를 명시하세요.');
}
