// 백엔드 `com.wecandoit.member.domain.AuthProvider`의 소셜 값과 1:1로 대응한다.
export const SOCIAL_PROVIDERS = ['GOOGLE', 'KAKAO'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  GOOGLE: 'Google',
  KAKAO: '카카오',
};
