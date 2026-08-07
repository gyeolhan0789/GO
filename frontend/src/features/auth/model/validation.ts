import type { Gender } from '../constants/genders';
import type { Region } from '../constants/regions';

// 백엔드 Bean Validation 규칙의 사본이다. 여기서 통과해도 서버가 거절할 수 있고,
// 그때는 서버 메시지가 우선한다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 10;

type LoginField = 'email' | 'password';
type SignupField =
  | LoginField
  | 'passwordConfirm'
  | 'nickname'
  | 'region'
  | 'gender';

/** 소셜 가입에서 추가로 받는 항목. 이메일·비밀번호는 제공자가 대신한다. */
type SocialSignupField = 'nickname' | 'region' | 'gender';

export type LoginErrors = Partial<Record<LoginField, string>>;
export type SignupErrors = Partial<Record<SignupField, string>>;
export type SocialSignupErrors = Partial<Record<SocialSignupField, string>>;

type LoginValues = {
  email: string;
  password: string;
};

type SignupValues = LoginValues & {
  passwordConfirm: string;
  nickname: string;
  region: Region | null;
  gender: Gender | null;
};

type SocialSignupValues = {
  nickname: string;
  region: Region | null;
  gender: Gender | null;
};

// 화면이 서버로 보내는 값과 같은 기준으로 검사한다. 앞뒤 공백은 다듬어 보내므로
// 여기서도 다듬은 값을 본다 — 그러지 않으면 자동완성이 붙인 공백 하나 때문에
// 실제로는 통과할 이메일이 형식 오류로 막힌다.
function validateEmail(email: string) {
  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return '이메일은 필수입니다.';
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return '이메일 형식이 올바르지 않습니다.';
  }

  return undefined;
}

function validateNickname(nickname: string) {
  const trimmed = nickname.trim();

  if (trimmed.length === 0) {
    return '닉네임은 필수입니다.';
  }

  if (
    trimmed.length < NICKNAME_MIN_LENGTH ||
    trimmed.length > NICKNAME_MAX_LENGTH
  ) {
    return `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하이어야 합니다.`;
  }

  return undefined;
}

export function validateLogin({ email, password }: LoginValues): LoginErrors {
  const errors: LoginErrors = {};

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  if (password.length === 0) {
    errors.password = '비밀번호는 필수입니다.';
  }

  return errors;
}

export function validateSignup({
  email,
  password,
  passwordConfirm,
  nickname,
  region,
  gender,
}: SignupValues): SignupErrors {
  const errors: SignupErrors = {};

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  if (password.length === 0) {
    errors.password = '비밀번호는 필수입니다.';
  } else if (!PASSWORD_PATTERN.test(password)) {
    errors.password =
      '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.';
  }

  // 비밀번호 확인은 서버로 보내지 않는 클라이언트 전용 검증이다.
  if (passwordConfirm.length === 0) {
    errors.passwordConfirm = '비밀번호 확인은 필수입니다.';
  } else if (passwordConfirm !== password) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
  }

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    errors.nickname = nicknameError;
  }

  if (region === null) {
    errors.region = '지역은 필수입니다.';
  }

  if (gender === null) {
    errors.gender = '성별은 필수입니다.';
  }

  return errors;
}

export function validateSocialSignup({
  nickname,
  region,
  gender,
}: SocialSignupValues): SocialSignupErrors {
  const errors: SocialSignupErrors = {};

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    errors.nickname = nicknameError;
  }

  if (region === null) {
    errors.region = '지역은 필수입니다.';
  }

  if (gender === null) {
    errors.gender = '성별은 필수입니다.';
  }

  return errors;
}
