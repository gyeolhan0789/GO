package com.wecandoit.auth.dto;

import com.wecandoit.member.domain.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OAuthSignupRequest(
        @NotBlank(message = "signupToken은 필수입니다.")
        String signupToken,

        @NotNull(message = "성별은 필수입니다.")
        Gender gender
) {
}
