declare module '@env' {
  // `.env`가 없으면 빌드 시점에 undefined가 인라인된다.
  export const API_BASE_URL: string | undefined;
  /**
   * Google 소셜 로그인용 **웹** 클라이언트 ID. Android SDK가 발급하는 ID 토큰의
   * `aud`가 웹 클라이언트 ID라서, 백엔드가 검증하는 값과 같아야 한다
   * (`application-*.yml`의 `oauth.providers.google.client-id`).
   */
  export const GOOGLE_WEB_CLIENT_ID: string | undefined;
}
