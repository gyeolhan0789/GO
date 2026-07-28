import { API_BASE_URL } from '@env';

// `.env`가 없을 때의 개발 기본값.
// Android(에뮬레이터/실기기)는 Metro와 같은 방식으로 `adb reverse tcp:8080 tcp:8080`을
// 걸어야 이 주소가 호스트로 터널된다. `npm run android:reverse` 참고.
const DEFAULT_BASE_URL = 'http://localhost:8080';

// client와 refreshAccessToken이 모두 필요해서 별도 모듈로 뺐다. 한쪽에 두면
// 401 재발급 경로 때문에 두 모듈이 순환 참조된다.
export const BASE_URL = API_BASE_URL || DEFAULT_BASE_URL;
