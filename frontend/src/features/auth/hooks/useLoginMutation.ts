import { useMutation } from '@tanstack/react-query';

import { login } from '../api/authApi';
import type { LoginRequest } from '../api/authApi';
import { useAuth } from '../model/AuthContext';

export function useLoginMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: (variables: LoginRequest) => login(variables),
    onSuccess: response => signIn(response.accessToken),
  });
}
