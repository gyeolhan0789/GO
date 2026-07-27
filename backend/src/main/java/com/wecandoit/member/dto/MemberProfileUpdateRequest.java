package com.wecandoit.member.dto;

import com.wecandoit.member.domain.Region;
import com.wecandoit.member.domain.Gender;
import jakarta.validation.constraints.Size;

public record MemberProfileUpdateRequest(

        @Size(
                min = MemberValidationRules.NICKNAME_MIN_LENGTH,
                max = MemberValidationRules.NICKNAME_MAX_LENGTH,
                message = MemberValidationRules.NICKNAME_LENGTH_MESSAGE
        )
        String nickname,

        Region region,

        Gender gender
) {
    public MemberProfileUpdateRequest(String nickname, Region region) {
        this(nickname, region, null);
    }
}
