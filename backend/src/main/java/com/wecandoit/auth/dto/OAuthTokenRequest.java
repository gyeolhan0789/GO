package com.wecandoit.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.wecandoit.member.domain.Gender;

public record OAuthTokenRequest(
        @NotBlank(message = "idToken은 필수입니다.")
        String idToken,

        @NotNull(message = "성별은 필수입니다.")
        Gender gender
) {
}
