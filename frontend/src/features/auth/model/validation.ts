import type { Region } from '../constants/regions';

// 백엔드 Bean Validation 규칙의 사본이다. 여기서 통과해도 서버가 거절할 수 있고,
// 그때는 서버 메시지가 우선한다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 10;

type LoginField = 'email' | 'password';
type SignupField = LoginField | 'nickname' | 'region';

export type LoginErrors = Partial<Record<LoginField, string>>;
export type SignupErrors = Partial<Record<SignupField, string>>;

type LoginValues = {
  email: string;
  password: string;
};

type SignupValues = LoginValues & {
  nickname: string;
  region: Region | null;
};

function validateEmail(email: string) {
  if (email.trim().length === 0) {
    return '이메일은 필수입니다.';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return '이메일 형식이 올바르지 않습니다.';
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
  nickname,
  region,
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

  const trimmedNickname = nickname.trim();
  if (trimmedNickname.length === 0) {
    errors.nickname = '닉네임은 필수입니다.';
  } else if (
    trimmedNickname.length < NICKNAME_MIN_LENGTH ||
    trimmedNickname.length > NICKNAME_MAX_LENGTH
  ) {
    errors.nickname = `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하이어야 합니다.`;
  }

  if (region === null) {
    errors.region = '지역은 필수입니다.';
  }

  return errors;
}
