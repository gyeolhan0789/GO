package com.wecandoit.friend.dto;

import jakarta.validation.constraints.NotNull;

public record SendFriendRequest(
        @NotNull(message = "친구 요청 대상 회원 ID는 필수입니다.")
        Long inviteeId
) {
}
