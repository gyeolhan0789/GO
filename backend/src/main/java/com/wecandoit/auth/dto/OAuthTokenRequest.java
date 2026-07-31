package com.wecandoit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthTokenRequest(
        @NotBlank(message = "idToken은 필수입니다.")
        String idToken
) {
}
