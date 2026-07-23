package com.wecandoit.member.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("비밀번호 변경 요청 검증")
class PasswordChangeRequestTest {

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
    @DisplayName("현재 비밀번호와 새 비밀번호가 모두 규칙을 따르면 검증을 통과한다")
    void validRequestHasNoViolations() {
        PasswordChangeRequest request = new PasswordChangeRequest("oldPassword1!", "newPassword1!");

        Set<ConstraintViolation<PasswordChangeRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("새 비밀번호가 복잡도 규칙을 위반하면 검증에 실패한다")
    void weakNewPasswordFails() {
        PasswordChangeRequest request = new PasswordChangeRequest("oldPassword1!", "weak");

        Set<ConstraintViolation<PasswordChangeRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(ConstraintViolation::getPropertyPath)
                .extracting(Object::toString)
                .contains("newPassword");
    }

    @Test
    @DisplayName("현재 비밀번호가 비어있으면 검증에 실패한다")
    void blankCurrentPasswordFails() {
        PasswordChangeRequest request = new PasswordChangeRequest("", "newPassword1!");

        Set<ConstraintViolation<PasswordChangeRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(ConstraintViolation::getPropertyPath)
                .extracting(Object::toString)
                .contains("currentPassword");
    }
}
