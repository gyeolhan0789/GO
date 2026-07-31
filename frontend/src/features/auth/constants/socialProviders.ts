// 백엔드 `com.wecandoit.member.domain.AuthProvider`의 소셜 값과 1:1로 대응한다.
export const SOCIAL_PROVIDERS = ['GOOGLE', 'KAKAO'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/** 화면 문구에 넣는 제공자 이름. */
export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  GOOGLE: 'Google',
  KAKAO: '카카오',
};
