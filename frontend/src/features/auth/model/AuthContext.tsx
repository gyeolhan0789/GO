import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { PropsWithChildren } from 'react';

import {
  getAccessToken,
  setAccessToken,
  subscribeAccessToken,
} from '../../../shared/api/accessTokenStore';
import { refreshAccessToken } from '../../../shared/api/refreshAccessToken';

/**
 * `restoring`은 앱을 켠 직후 쿠키의 refreshToken으로 세션 복구를 시도하는 구간이다.
 * 이때는 로그인 여부를 아직 알 수 없으므로 화면을 고르면 안 된다.
 */
type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (accessToken: string) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isRestoring, setIsRestoring] = useState(true);

  // 액세스 토큰의 유일한 진실은 `accessTokenStore`다. 로그인 말고도 client의 401
  // 재발급 경로가 토큰을 갱신하거나 비우므로, 구독해서 그 변화를 그대로 따라간다.
  const accessToken = useSyncExternalStore(
    subscribeAccessToken,
    getAccessToken,
  );

  useEffect(() => {
    let cancelled = false;

    // 액세스 토큰은 메모리에만 있어 재시작하면 없다. 쿠키에 refreshToken이 남아
    // 있으면 여기서 재발급되어 로그인 상태가 그대로 이어지고, 없으면 실패하며
    // 로그인 화면으로 간다.
    refreshAccessToken().finally(() => {
      if (!cancelled) {
        setIsRestoring(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((token: string) => {
    setAccessToken(token);
  }, []);

  const value = useMemo<AuthState>(() => {
    const status: AuthStatus = isRestoring
      ? 'restoring'
      : accessToken === null
      ? 'unauthenticated'
      : 'authenticated';

    return {
      status,
      isAuthenticated: status === 'authenticated',
      signIn,
    };
  }, [accessToken, isRestoring, signIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }

  return context;
}
