declare module '@env' {
  // `.env`가 없으면 빌드 시점에 undefined가 인라인된다.
  export const API_BASE_URL: string | undefined;
}
