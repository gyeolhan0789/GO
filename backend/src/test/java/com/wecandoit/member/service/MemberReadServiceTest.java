package com.wecandoit.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.repository.FriendRequestRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.dto.MemberRelationshipStatus;
import com.wecandoit.member.dto.MemberSearchResponse;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("회원 조회 서비스")
@ExtendWith(MockitoExtension.class)
class MemberReadServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private FriendRepository friendRepository;
    @Mock
    private FriendRequestRepository friendRequestRepository;
    private MemberReadService memberReadService;

    @BeforeEach
    void setUp() {
        memberReadService = new MemberReadService(memberRepository, friendRepository, friendRequestRepository);
    }

    @Test
    @DisplayName("닉네임 부분 검색 결과에 현재 관계 상태를 포함한다")
    void searchMembersIncludesRelationshipStatus() {
        // given
        Member loginMember = member(1L, "나");
        Member friend = member(2L, "산책친구");
        Member sent = member(3L, "산책메이트");
        Member received = member(4L, "산책동료");
        Member none = member(5L, "산책초보");
        PageRequest pageable = PageRequest.of(0, 4);
        given(memberRepository.findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                "산책",
                1L,
                pageable
        )).willReturn(new PageImpl<>(List.of(friend, sent, received, none), pageable, 4));
        given(friendRepository.findFriendMemberIds(ArgumentMatchers.eq(1L), ArgumentMatchers.anySet()))
                .willReturn(List.of(2L));
        given(friendRequestRepository.findPendingRelatedTo(ArgumentMatchers.eq(1L), ArgumentMatchers.anySet()))
                .willReturn(List.of(
                        FriendRequest.create(loginMember, sent),
                        FriendRequest.create(received, loginMember)
                ));

        // when
        PageResponse<MemberSearchResponse> responses =
                memberReadService.searchMembers(1L, " 산책 ", pageable);

        // then
        assertThat(responses.content())
                .extracting(MemberSearchResponse::memberId, MemberSearchResponse::relationshipStatus)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(2L, MemberRelationshipStatus.FRIEND),
                        org.assertj.core.groups.Tuple.tuple(3L, MemberRelationshipStatus.REQUEST_SENT),
                        org.assertj.core.groups.Tuple.tuple(4L, MemberRelationshipStatus.REQUEST_RECEIVED),
                        org.assertj.core.groups.Tuple.tuple(5L, MemberRelationshipStatus.NONE)
                );
        assertThat(responses.totalElements()).isEqualTo(4);
    }

    @Test
    @DisplayName("회원 ID 목록으로 닉네임을 조회한다")
    void getNicknamesByIdsReturnsNicknames() {
        // given
        Member firstMember = member(1L, "첫번째");
        Member secondMember = member(2L, "두번째");
        given(memberRepository.findAllById(ArgumentMatchers.anyIterable()))
                .willReturn(List.of(firstMember, secondMember));

        // when
        Map<Long, String> nicknamesById = memberReadService.getNicknamesByIds(List.of(1L, 2L));

        // then
        assertThat(nicknamesById)
                .containsEntry(1L, "첫번째")
                .containsEntry(2L, "두번째");
    }

    @Test
    @DisplayName("회원 ID 목록 중 찾을 수 없는 회원이 있으면 실패한다")
    void getNicknamesByIdsRejectsMissingMember() {
        // given
        Member member = member(1L, "첫번째");
        given(memberRepository.findAllById(ArgumentMatchers.anyIterable())).willReturn(List.of(member));

        // when & then
        assertThatThrownBy(() -> memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
