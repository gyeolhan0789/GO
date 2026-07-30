import { BASE_URL } from './baseUrl';

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * 서버가 내려준 이미지 경로를 `Image`에 바로 넘길 수 있는 절대 URL로 바꾼다.
 *
 * 아이템·기본 캐릭터 이미지는 관리자가 업로드한 파일이라 로컬/개발 환경에서는
 * `/uploads/...` 같은 서버 상대 경로로 내려온다. RN의 `Image`에는 브라우저처럼
 * 기준 주소가 없어서 상대 경로를 그대로 넘기면 아무것도 그려지지 않는다.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  if (ABSOLUTE_URL_PATTERN.test(url)) {
    return url;
  }

  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
