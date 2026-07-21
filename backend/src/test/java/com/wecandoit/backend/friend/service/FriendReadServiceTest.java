package com.wecandoit.backend.friend.service;

import com.wecandoit.backend.friend.domain.Friend;
import com.wecandoit.backend.friend.repository.FriendRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.wecandoit.backend.friend.dto.FriendResponse;
import com.wecandoit.backend.domain.member.Member;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("친구 조회 서비스")
class FriendReadServiceTest {

    private final FriendRepository friendRepository = Mockito.mock(FriendRepository.class);
    private final FriendReadService friendReadService = new FriendReadService(friendRepository);

    @Test
    @DisplayName("관계 저장 방향과 관계없이 상대 회원을 친구 목록으로 반환한다")
    void getFriendsReturnsOtherMemberFromBothDirections() {
        // given
        Member loginMember = member(2L, "로그인회원");
        Member smallerIdFriend = member(1L, "첫번째친구");
        Member largerIdFriend = member(3L, "두번째친구");
        when(friendRepository.findAllByMemberId(2L)).thenReturn(List.of(
                Friend.create(loginMember, smallerIdFriend),
                Friend.create(loginMember, largerIdFriend)
        ));

        // when
        List<FriendResponse> responses = friendReadService.getFriends(2L);

        // then
        assertThat(responses)
                .extracting(FriendResponse::memberId, FriendResponse::nickname)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(1L, "첫번째친구"),
                        org.assertj.core.groups.Tuple.tuple(3L, "두번째친구")
                );
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
