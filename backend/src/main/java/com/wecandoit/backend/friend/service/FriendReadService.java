package com.wecandoit.backend.friend.service;

import com.wecandoit.backend.friend.repository.FriendRepository;

import com.wecandoit.backend.friend.dto.FriendResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendReadService {

    private final FriendRepository friendRepository;

    public List<FriendResponse> getFriends(Long memberId) {
        return friendRepository.findAllByMemberId(memberId).stream()
                .map(friend -> friend.getFriendOf(memberId))
                .map(FriendResponse::from)
                .toList();
    }
}
