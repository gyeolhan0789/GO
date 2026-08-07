import {
  validateLogin,
  validateSignup,
} from '../src/features/auth/model/validation';
import type { Gender } from '../src/features/auth/constants/genders';
import type { Region } from '../src/features/auth/constants/regions';

const VALID = {
  email: 'go@example.com',
  password: 'abcd1234!',
  passwordConfirm: 'abcd1234!',
  nickname: '홍길동',
  region: 'SEOUL' as Region,
  gender: 'MALE' as Gender,
};

describe('validateSignup', () => {
  it('모든 값이 올바르면 오류가 없다', () => {
    expect(validateSignup(VALID)).toEqual({});
  });

  it('비밀번호 확인이 비어 있으면 필수 오류를 낸다', () => {
    const errors = validateSignup({ ...VALID, passwordConfirm: '' });
    expect(errors.passwordConfirm).toBeDefined();
  });

  it('비밀번호와 확인 값이 다르면 불일치 오류를 낸다', () => {
    const errors = validateSignup({
      ...VALID,
      passwordConfirm: 'different1!',
    });
    expect(errors.passwordConfirm).toBe('비밀번호가 일치하지 않습니다.');
  });

  it('지역과 성별이 없으면 각각 오류를 낸다', () => {
    const errors = validateSignup({ ...VALID, region: null, gender: null });
    expect(errors.region).toBeDefined();
    expect(errors.gender).toBeDefined();
  });

  it('앞뒤 공백이 붙은 이메일도 형식 오류로 막지 않는다', () => {
    // 화면은 다듬은 값을 보내므로 검증도 같은 값을 봐야 한다.
    const errors = validateSignup({ ...VALID, email: '  go@example.com  ' });
    expect(errors.email).toBeUndefined();
  });

  it('공백만 있는 이메일은 필수 오류를 낸다', () => {
    const errors = validateSignup({ ...VALID, email: '   ' });
    expect(errors.email).toBe('이메일은 필수입니다.');
  });

  it('앞뒤 공백이 붙은 닉네임도 다듬은 길이로 본다', () => {
    expect(validateSignup({ ...VALID, nickname: '  홍길동  ' }).nickname).toBe(
      undefined,
    );
    expect(validateSignup({ ...VALID, nickname: ' 홍 ' }).nickname).toBeDefined();
  });
});

describe('validateLogin', () => {
  it('앞뒤 공백이 붙은 이메일도 형식 오류로 막지 않는다', () => {
    const errors = validateLogin({
      email: '  go@example.com  ',
      password: 'abcd1234!',
    });
    expect(errors).toEqual({});
  });

  it('가운데 공백이 섞인 이메일은 형식 오류를 낸다', () => {
    const errors = validateLogin({
      email: 'go @example.com',
      password: 'abcd1234!',
    });
    expect(errors.email).toBe('이메일 형식이 올바르지 않습니다.');
  });
});
