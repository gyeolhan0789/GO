import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';

import { setAccessToken } from '../../../shared/api/accessTokenStore';

type AuthState = {
  isAuthenticated: boolean;
  signIn: (accessToken: string) => void;
};

const AuthContext = createContext<AuthState | null>(null);

// 이 Provider가 `accessTokenStore`의 유일한 writer이므로
// `isAuthenticated`와 저장된 토큰은 서로 어긋날 수 없다.
export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const signIn = useCallback((accessToken: string) => {
    setAccessToken(accessToken);
    setIsAuthenticated(true);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isAuthenticated, signIn }),
    [isAuthenticated, signIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }

  return context;
}
