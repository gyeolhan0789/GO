package com.wecandoit.friendrequest.repository;

import com.wecandoit.friendrequest.domain.FriendRequest;
import com.wecandoit.friendrequest.domain.FriendRequestStatus;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("친구 요청 저장소")
class FriendRequestRepositoryTest {

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("두 회원 사이의 대기 요청을 요청 방향과 관계없이 조회한다")
    void findPendingBetweenFindsReverseDirection() {
        // given
        Member firstMember = saveMember("first@example.com", "첫번째");
        Member secondMember = saveMember("second@example.com", "두번째");
        FriendRequest request = friendRequestRepository.save(
                FriendRequest.create(secondMember, firstMember)
        );

        // when
        FriendRequest found = friendRequestRepository
                .findPendingBetween(firstMember.getId(), secondMember.getId())
                .orElseThrow();

        // then
        assertThat(found.getId()).isEqualTo(request.getId());
    }

    @Test
    @DisplayName("받은 친구 요청 조회에는 대기 상태 요청만 포함한다")
    void findReceivedRequestsReturnsOnlyPending() {
        // given
        Member invitee = saveMember("invitee@example.com", "수신자");
        Member pendingInviter = saveMember("pending@example.com", "대기요청자");
        Member acceptedInviter = saveMember("accepted@example.com", "수락요청자");
        FriendRequest pendingRequest = friendRequestRepository.save(
                FriendRequest.create(pendingInviter, invitee)
        );
        FriendRequest acceptedRequest = FriendRequest.create(acceptedInviter, invitee);
        acceptedRequest.accept();
        friendRequestRepository.save(acceptedRequest);

        // when
        List<FriendRequest> requests = friendRequestRepository
                .findAllByInviteeIdAndStatusOrderByCreatedAtDesc(
                        invitee.getId(),
                        FriendRequestStatus.PENDING
                );

        // then
        assertThat(requests).extracting(FriendRequest::getId).containsExactly(pendingRequest.getId());
    }

    private Member saveMember(String email, String nickname) {
        return memberRepository.save(Member.create(email, "password", nickname));
    }
}
