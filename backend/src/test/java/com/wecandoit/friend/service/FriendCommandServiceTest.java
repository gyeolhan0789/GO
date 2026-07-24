package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("친구 명령 서비스")
class FriendCommandServiceTest {

    @Mock
    private FriendRepository friendRepository;
    private FriendCommandService friendCommandService;

    @BeforeEach
    void setUp() {
        friendCommandService = new FriendCommandService(friendRepository);
    }

    @Test
    @DisplayName("친구 관계가 존재하면 관계를 삭제한다")
    void deleteFriendDeletesFriend() {
        // given
        Friend friend = Friend.create(member(1L, "회원"), member(2L, "친구"));
        given(friendRepository.findBetween(1L, 2L)).willReturn(Optional.of(friend));

        // when
        friendCommandService.deleteFriend(1L, 2L);

        // then
        then(friendRepository).should().delete(friend);
    }

    @Test
    @DisplayName("친구 관계가 존재하지 않으면 삭제에 실패한다")
    void deleteFriendRejectsMissingFriend() {
        // given
        given(friendRepository.findBetween(1L, 2L)).willReturn(Optional.empty());

        // when & then
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
