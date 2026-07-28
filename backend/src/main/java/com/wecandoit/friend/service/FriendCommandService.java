package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FriendCommandService {

    private final FriendRepository friendRepository;

    public void deleteFriend(Long memberId, Long friendId) {
        Friend friend = friendRepository.findBetween(memberId, friendId)
                .orElseThrow(() -> new CustomException(ErrorCode.FRIEND_NOT_FOUND));
        friendRepository.delete(friend);
    }
}
