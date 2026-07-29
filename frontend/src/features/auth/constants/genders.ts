// 백엔드 `com.wecandoit.member.domain.Gender` enum과 1:1로 대응한다.
export const GENDERS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
] as const;

export type Gender = (typeof GENDERS)[number]['value'];
