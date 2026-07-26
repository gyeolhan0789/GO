// 메모리에만 보관하므로 앱을 재시작하면 사라진다.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}
