package com.wecandoit.backend.friendrequest.service;

import com.wecandoit.backend.friendrequest.domain.FriendRequest;
import com.wecandoit.backend.friendrequest.domain.FriendRequestStatus;
import com.wecandoit.backend.friendrequest.repository.FriendRequestRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.wecandoit.backend.friendrequest.dto.ReceivedFriendRequestResponse;
import com.wecandoit.backend.domain.member.Member;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("친구 요청 조회 서비스")
class FriendRequestReadServiceTest {

    private final FriendRequestRepository friendRequestRepository = Mockito.mock(FriendRequestRepository.class);
    private final FriendRequestReadService friendRequestReadService = new FriendRequestReadService(
            friendRequestRepository
    );

    @Test
    @DisplayName("받은 대기 친구 요청을 최신순 응답으로 반환한다")
    void getReceivedRequestsReturnsPendingRequests() {
        // given
        Member inviter = member(1L, "보낸사람");
        Member invitee = member(2L, "받는사람");
        FriendRequest friendRequest = FriendRequest.create(inviter, invitee);
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 19, 12, 0);
        ReflectionTestUtils.setField(friendRequest, "id", 10L);
        ReflectionTestUtils.setField(friendRequest, "createdAt", createdAt);
        when(friendRequestRepository.findAllByInviteeIdAndStatusOrderByCreatedAtDesc(
                2L,
                FriendRequestStatus.PENDING
        )).thenReturn(List.of(friendRequest));

        // when
        List<ReceivedFriendRequestResponse> responses = friendRequestReadService.getReceivedRequests(2L);

        // then
        assertThat(responses).containsExactly(
                new ReceivedFriendRequestResponse(10L, 1L, "보낸사람", createdAt)
        );
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
