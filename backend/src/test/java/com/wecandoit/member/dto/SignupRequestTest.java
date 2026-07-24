package com.wecandoit.member.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.member.domain.Region;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원가입 요청 검증")
class SignupRequestTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        validatorFactory.close();
    }

    @Test
    @DisplayName("모든 값이 올바르면 검증을 통과한다")
    void validRequestHasNoViolations() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "닉네임", Region.SEOUL);

        // when
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("닉네임이 2자 미만이면 검증에 실패한다")
    void nicknameTooShortFails() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "가", Region.SEOUL);

        // when
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);

        // then
        assertThat(violations)
                .extracting(ConstraintViolation::getPropertyPath)
                .extracting(Object::toString)
                .contains("nickname");
    }

    @Test
    @DisplayName("닉네임이 10자를 초과하면 검증에 실패한다")
    void nicknameTooLongFails() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "가나다라마바사아자차카", Region.SEOUL);

        // when
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);

        // then
        assertThat(violations)
                .extracting(ConstraintViolation::getPropertyPath)
                .extracting(Object::toString)
                .contains("nickname");
    }

    @Test
    @DisplayName("지역이 없으면 검증에 실패한다")
    void missingRegionFails() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "닉네임", null);

        // when
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);

        // then
        assertThat(violations)
                .extracting(ConstraintViolation::getPropertyPath)
                .extracting(Object::toString)
                .contains("region");
    }
}
