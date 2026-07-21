package com.wecandoit.backend.domain.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.wecandoit.backend.friend.repository.FriendRepository;
import com.wecandoit.backend.friendrequest.domain.FriendRequest;
import com.wecandoit.backend.friendrequest.repository.FriendRequestRepository;
import com.wecandoit.backend.domain.member.dto.MemberRelationshipStatus;
import com.wecandoit.backend.domain.member.dto.MemberSearchResponse;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("회원 조회 서비스")
class MemberReadServiceTest {

    private final MemberRepository memberRepository = Mockito.mock(MemberRepository.class);
    private final FriendRepository friendRepository = Mockito.mock(FriendRepository.class);
    private final FriendRequestRepository friendRequestRepository = Mockito.mock(FriendRequestRepository.class);
    private final MemberReadService memberReadService = new MemberReadService(
            memberRepository,
            friendRepository,
            friendRequestRepository
    );

    @Test
    @DisplayName("닉네임 부분 검색 결과에 현재 관계 상태를 포함한다")
    void searchMembersIncludesRelationshipStatus() {
        // given
        Member loginMember = member(1L, "나");
        Member friend = member(2L, "산책친구");
        Member sent = member(3L, "산책메이트");
        Member received = member(4L, "산책동료");
        Member none = member(5L, "산책초보");
        when(memberRepository.findByNicknameContainingIgnoreCaseAndIdNot("산책", 1L))
                .thenReturn(List.of(friend, sent, received, none));
        when(friendRepository.findFriendMemberIds(ArgumentMatchers.eq(1L), ArgumentMatchers.anySet()))
                .thenReturn(List.of(2L));
        when(friendRequestRepository.findPendingRelatedTo(ArgumentMatchers.eq(1L), ArgumentMatchers.anySet()))
                .thenReturn(List.of(
                        FriendRequest.create(loginMember, sent),
                        FriendRequest.create(received, loginMember)
                ));

        // when
        List<MemberSearchResponse> responses = memberReadService.searchMembers(1L, " 산책 ");

        // then
        assertThat(responses)
                .extracting(MemberSearchResponse::memberId, MemberSearchResponse::relationshipStatus)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(2L, MemberRelationshipStatus.FRIEND),
                        org.assertj.core.groups.Tuple.tuple(3L, MemberRelationshipStatus.REQUEST_SENT),
                        org.assertj.core.groups.Tuple.tuple(4L, MemberRelationshipStatus.REQUEST_RECEIVED),
                        org.assertj.core.groups.Tuple.tuple(5L, MemberRelationshipStatus.NONE)
                );
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
