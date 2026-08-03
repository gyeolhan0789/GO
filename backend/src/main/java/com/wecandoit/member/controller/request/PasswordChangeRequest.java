package com.wecandoit.member.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordChangeRequest(

        @NotBlank(message = "현재 비밀번호는 필수입니다.")
        String currentPassword,

        @NotBlank(message = "새 비밀번호는 필수입니다.")
        @Pattern(
                regexp = MemberValidationRules.PASSWORD_PATTERN,
                message = MemberValidationRules.PASSWORD_PATTERN_MESSAGE
        )
        String newPassword
) {
}
