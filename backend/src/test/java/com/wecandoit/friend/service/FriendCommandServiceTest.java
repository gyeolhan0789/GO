package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("친구 명령 서비스")
class FriendCommandServiceTest {

    private final FriendRepository friendRepository = Mockito.mock(FriendRepository.class);
    private final FriendCommandService friendCommandService = new FriendCommandService(friendRepository);

    @Test
    @DisplayName("친구 관계가 존재하면 관계를 삭제한다")
    void deleteFriendDeletesFriend() {
        // given
        Friend friend = Friend.create(member(1L, "회원"), member(2L, "친구"));
        when(friendRepository.findBetween(1L, 2L)).thenReturn(Optional.of(friend));

        // when
        friendCommandService.deleteFriend(1L, 2L);

        // then
        verify(friendRepository).delete(friend);
    }

    @Test
    @DisplayName("친구 관계가 존재하지 않으면 삭제에 실패한다")
    void deleteFriendRejectsMissingFriend() {
        // given
        when(friendRepository.findBetween(1L, 2L)).thenReturn(Optional.empty());

        // when, then
        assertThatThrownBy(() -> friendCommandService.deleteFriend(1L, 2L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FRIEND_NOT_FOUND);
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
