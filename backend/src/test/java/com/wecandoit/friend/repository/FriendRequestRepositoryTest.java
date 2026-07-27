package com.wecandoit.friend.repository;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.domain.FriendRequestStatus;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
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
    @Autowired
    private FriendRepository friendRepository;
    @Autowired
    private EntityManager entityManager;

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

    @Test
    @DisplayName("보낸 요청 조회에는 로그인 회원이 발신자인 대기 요청만 포함한다")
    void findPendingSentRequestsReturnsOnlyInviterPendingRequests() {
        // given
        Member loginMember = saveMember("login@example.com", "로그인회원");
        Member pendingInvitee = saveMember("pending@example.com", "대기수신자");
        Member acceptedInvitee = saveMember("accepted@example.com", "수락수신자");
        Member rejectedInvitee = saveMember("rejected@example.com", "거절수신자");
        Member otherMember = saveMember("other@example.com", "다른회원");
        FriendRequest pendingRequest = friendRequestRepository.save(
                FriendRequest.create(loginMember, pendingInvitee)
        );
        FriendRequest acceptedRequest = FriendRequest.create(loginMember, acceptedInvitee);
        acceptedRequest.accept();
        friendRequestRepository.save(acceptedRequest);
        FriendRequest rejectedRequest = FriendRequest.create(loginMember, rejectedInvitee);
        rejectedRequest.reject();
        friendRequestRepository.save(rejectedRequest);
        friendRequestRepository.save(FriendRequest.create(otherMember, loginMember));
        friendRequestRepository.save(FriendRequest.create(otherMember, pendingInvitee));

        // when
        List<FriendRequest> requests = friendRequestRepository.findPendingSentRequests(loginMember.getId());

        // then
        assertThat(requests)
                .extracting(FriendRequest::getId)
                .containsExactly(pendingRequest.getId());
    }

    @Test
    @DisplayName("이미 실제 친구인 회원의 대기 요청은 보낸 요청 조회에서 제외한다")
    void findPendingSentRequestsExcludesExistingFriend() {
        // given
        Member loginMember = saveMember("login@example.com", "로그인회원");
        Member friendMember = saveMember("friend@example.com", "친구회원");
        friendRequestRepository.save(FriendRequest.create(loginMember, friendMember));
        friendRepository.save(Friend.create(loginMember, friendMember));

        // when
        List<FriendRequest> requests = friendRequestRepository.findPendingSentRequests(loginMember.getId());

        // then
        assertThat(requests).isEmpty();
    }

    @Test
    @DisplayName("보낸 대기 요청을 생성 시각과 요청 ID 내림차순으로 조회한다")
    void findPendingSentRequestsOrdersByCreatedAtAndIdDescending() {
        // given
        Member loginMember = saveMember("login@example.com", "로그인회원");
        Member firstInvitee = saveMember("first@example.com", "첫수신자");
        Member secondInvitee = saveMember("second@example.com", "둘수신자");
        Member latestInvitee = saveMember("latest@example.com", "최신수신자");
        FriendRequest firstRequest = friendRequestRepository.saveAndFlush(
                FriendRequest.create(loginMember, firstInvitee)
        );
        FriendRequest secondRequest = friendRequestRepository.saveAndFlush(
                FriendRequest.create(loginMember, secondInvitee)
        );
        FriendRequest latestRequest = friendRequestRepository.saveAndFlush(
                FriendRequest.create(loginMember, latestInvitee)
        );
        LocalDateTime sameCreatedAt = LocalDateTime.of(2026, 7, 27, 10, 0);
        entityManager.createQuery("""
                        update FriendRequest fr
                        set fr.createdAt = :sameCreatedAt
                        where fr.id in :requestIds
                        """)
                .setParameter("sameCreatedAt", sameCreatedAt)
                .setParameter("requestIds", List.of(firstRequest.getId(), secondRequest.getId()))
                .executeUpdate();
        entityManager.createQuery("""
                        update FriendRequest fr
                        set fr.createdAt = :latestCreatedAt
                        where fr.id = :requestId
                        """)
                .setParameter("latestCreatedAt", sameCreatedAt.plusHours(1))
                .setParameter("requestId", latestRequest.getId())
                .executeUpdate();
        entityManager.clear();

        // when
        List<FriendRequest> requests = friendRequestRepository.findPendingSentRequests(loginMember.getId());

        // then
        assertThat(requests)
                .extracting(FriendRequest::getId)
                .containsExactly(latestRequest.getId(), secondRequest.getId(), firstRequest.getId());
    }

    private Member saveMember(String email, String nickname) {
        return memberRepository.save(Member.create(email, "password", nickname));
    }
}
