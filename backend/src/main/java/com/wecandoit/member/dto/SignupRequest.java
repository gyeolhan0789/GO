package com.wecandoit.member.dto;

import com.wecandoit.member.domain.Region;
import com.wecandoit.member.domain.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(

        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        String email,

        @NotBlank(message = "비밀번호는 필수입니다.")
        @Pattern(
                regexp = MemberValidationRules.PASSWORD_PATTERN,
                message = MemberValidationRules.PASSWORD_PATTERN_MESSAGE
        )
        String password,

        @NotBlank(message = "닉네임은 필수입니다.")
        @Size(
                min = MemberValidationRules.NICKNAME_MIN_LENGTH,
                max = MemberValidationRules.NICKNAME_MAX_LENGTH,
                message = MemberValidationRules.NICKNAME_LENGTH_MESSAGE
        )
        String nickname,

        @NotNull(message = "지역은 필수입니다.")
        Region region,

        @NotNull(message = "성별은 필수입니다.")
        Gender gender
) {
    public SignupRequest(String email, String password, String nickname, Region region) {
        this(email, password, nickname, region, Gender.MALE);
    }
}
