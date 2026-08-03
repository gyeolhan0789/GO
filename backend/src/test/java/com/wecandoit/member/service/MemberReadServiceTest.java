package com.wecandoit.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.avatar.service.AvatarReadService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.repository.FriendRequestRepository;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.dto.MemberRelationshipStatus;
import com.wecandoit.member.dto.MemberSearchResponse;
import com.wecandoit.member.dto.MyPageResponse;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
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
    @Mock
    private AvatarReadService avatarReadService;
    private MemberReadService memberReadService;

    @BeforeEach
    void setUp() {
        memberReadService = new MemberReadService(
                memberRepository,
                friendRepository,
                friendRequestRepository,
                avatarReadService
        );
    }

    @Test
    @DisplayName("닉네임 검색 결과에 관계 상태와 캐릭터 정보를 포함한다")
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
        )).willReturn(new SliceImpl<>(
                List.of(friend, sent, received, none),
                pageable,
                false
        ));
        given(friendRepository.findFriendMemberIds(ArgumentMatchers.eq(1L), ArgumentMatchers.anySet()))
                .willReturn(List.of(2L));
        given(friendRequestRepository.findPendingRelatedTo(ArgumentMatchers.eq(1L), ArgumentMatchers.anySet()))
                .willReturn(List.of(
                        FriendRequest.create(loginMember, sent),
                        FriendRequest.create(received, loginMember)
                ));
        EquippedItemResponse equippedItem = new EquippedItemResponse(
                10L,
                100L,
                "빨간 모자",
                ItemCategory.HAT,
                "https://example.com/hat.png"
        );
        given(avatarReadService.getAvatars(List.of(friend, sent, received, none)))
                .willReturn(Map.of(
                        2L,
                        character(friend, "https://example.com/male.png", List.of(equippedItem)),
                        3L,
                        character(sent, "https://example.com/male.png", List.of()),
                        4L,
                        character(received, "https://example.com/male.png", List.of()),
                        5L,
                        character(none, "https://example.com/male.png", List.of())
                ));

        // when
        SliceResponse<MemberSearchResponse> responses =
                memberReadService.searchMembers(1L, " 산책 ", pageable);

        // then
        assertThat(responses.content())
                .extracting(
                        MemberSearchResponse::memberId,
                        MemberSearchResponse::relationshipStatus,
                        MemberSearchResponse::gender,
                        MemberSearchResponse::defaultImageUrl
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                2L,
                                MemberRelationshipStatus.FRIEND,
                                Gender.MALE,
                                "https://example.com/male.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                3L,
                                MemberRelationshipStatus.REQUEST_SENT,
                                Gender.MALE,
                                "https://example.com/male.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                4L,
                                MemberRelationshipStatus.REQUEST_RECEIVED,
                                Gender.MALE,
                                "https://example.com/male.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                5L,
                                MemberRelationshipStatus.NONE,
                                Gender.MALE,
                                "https://example.com/male.png"
                        )
                );
        assertThat(responses.content().getFirst().equippedItems()).containsExactly(equippedItem);
        assertThat(responses.content().get(1).equippedItems()).isEmpty();
        assertThat(responses.hasNext()).isFalse();
        then(avatarReadService).should()
                .getAvatars(List.of(friend, sent, received, none));
        then(memberRepository).should(never()).findAllById(ArgumentMatchers.anyIterable());
    }

    @Test
    @DisplayName("공백으로만 이루어진 검색어는 잘못된 입력으로 거부한다")
    void searchMembersRejectsBlankKeyword() {
        // when & then
        assertThatThrownBy(() -> memberReadService.searchMembers(
                1L,
                "   ",
                PageRequest.of(0, 20)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
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

    @Test
    @DisplayName("회원 ID 목록으로 현재 아바타를 일괄 조회한다")
    void getAvatarsByIdsReturnsAvatars() {
        // given
        Member firstMember = member(1L, "첫 번째");
        Member secondMember = member(2L, "두 번째");
        List<Member> members = List.of(firstMember, secondMember);
        Map<Long, CharacterResponse> avatars = Map.of(
                1L, character(firstMember, "https://example.com/male.png", List.of()),
                2L, character(secondMember, "https://example.com/male.png", List.of())
        );
        given(memberRepository.findAllById(ArgumentMatchers.anyIterable())).willReturn(members);
        given(avatarReadService.getAvatars(members)).willReturn(avatars);

        // when
        Map<Long, CharacterResponse> responses =
                memberReadService.getAvatarsByIds(List.of(1L, 2L));

        // then
        assertThat(responses).isEqualTo(avatars);
        then(avatarReadService).should().getAvatars(members);
    }

    @Test
    @DisplayName("회원 ID 목록이 비어 있으면 아바타를 조회하지 않는다")
    void getAvatarsByIdsReturnsEmptyMap() {
        // when & then
        assertThat(memberReadService.getAvatarsByIds(List.of())).isEmpty();

        then(memberRepository).shouldHaveNoInteractions();
        then(avatarReadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("아바타 조회 대상 회원이 누락되면 실패한다")
    void getAvatarsByIdsRejectsMissingMember() {
        // given
        Member member = member(1L, "첫 번째");
        given(memberRepository.findAllById(ArgumentMatchers.anyIterable())).willReturn(List.of(member));

        // when & then
        assertThatThrownBy(() -> memberReadService.getAvatarsByIds(List.of(1L, 2L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        then(avatarReadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("회원 ID로 마이페이지 정보를 조회한다")
    void getMyPageReturnsMemberInfo() {
        // given
        Member member = member(1L, "산책러");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));

        // when
        MyPageResponse response = memberReadService.getMyPage(1L);

        // then
        assertThat(response).isEqualTo(new MyPageResponse(
                1L,
                "산책러@example.com",
                "산책러",
                Gender.MALE,
                null,
                0L
        ));
    }

    @Test
    @DisplayName("존재하지 않는 회원 ID로 마이페이지를 조회하면 실패한다")
    void getMyPageRejectsMissingMember() {
        // given
        given(memberRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> memberReadService.getMyPage(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private CharacterResponse character(
            Member member,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems
    ) {
        return new CharacterResponse(
                member.getId(),
                member.getNickname(),
                member.getGender(),
                defaultImageUrl,
                equippedItems
        );
    }
}
