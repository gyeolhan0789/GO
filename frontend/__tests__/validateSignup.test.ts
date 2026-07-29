import { validateSignup } from '../src/features/auth/model/validation';
import type { Gender } from '../src/features/auth/constants/genders';
import type { Region } from '../src/features/auth/constants/regions';

const VALID = {
  email: 'go@example.com',
  password: 'abcd1234!',
  passwordConfirm: 'abcd1234!',
  nickname: '홍길동',
  region: 'SEOUL' as Region,
  gender: 'MALE' as Gender,
  agreeTerms: true,
  agreeAge: true,
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

  it('약관에 동의하지 않으면 오류를 낸다', () => {
    const errors = validateSignup({ ...VALID, agreeTerms: false });
    expect(errors.agreeTerms).toBeDefined();
  });

  it('만 14세 이상에 동의하지 않으면 오류를 낸다', () => {
    const errors = validateSignup({ ...VALID, agreeAge: false });
    expect(errors.agreeAge).toBeDefined();
  });

  it('지역과 성별이 없으면 각각 오류를 낸다', () => {
    const errors = validateSignup({ ...VALID, region: null, gender: null });
    expect(errors.region).toBeDefined();
    expect(errors.gender).toBeDefined();
  });
});
