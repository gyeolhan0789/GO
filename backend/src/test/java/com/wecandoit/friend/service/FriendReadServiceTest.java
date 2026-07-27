package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.response.PageResponse;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.member.domain.Member;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("친구 조회 서비스")
class FriendReadServiceTest {

    @Mock
    private FriendRepository friendRepository;
    private FriendReadService friendReadService;

    @BeforeEach
    void setUp() {
        friendReadService = new FriendReadService(friendRepository);
    }

    @Test
    @DisplayName("관계 저장 방향과 관계없이 상대 회원을 친구 목록으로 반환한다")
    void getFriendsReturnsOtherMemberFromBothDirections() {
        // given
        Member loginMember = member(2L, "로그인회원");
        Member smallerIdFriend = member(1L, "첫번째친구");
        Member largerIdFriend = member(3L, "두번째친구");
        PageRequest pageable = PageRequest.of(0, 2);
        given(friendRepository.findAllByMemberId(2L, pageable)).willReturn(new PageImpl<>(List.of(
                Friend.create(loginMember, smallerIdFriend),
                Friend.create(loginMember, largerIdFriend)
        ), pageable, 2));

        // when
        PageResponse<FriendResponse> responses = friendReadService.getFriends(2L, pageable);

        // then
        assertThat(responses.content())
                .extracting(FriendResponse::memberId, FriendResponse::nickname)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, "첫번째친구"),
                        org.assertj.core.groups.Tuple.tuple(3L, "두번째친구")
                );
        assertThat(responses.totalElements()).isEqualTo(2);
        assertThat(responses.currentPage()).isZero();
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
