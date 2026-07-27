package com.wecandoit.friend.service;

import com.wecandoit.common.response.PageResponse;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.friend.repository.FriendRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendReadService {

    private final FriendRepository friendRepository;

    public PageResponse<FriendResponse> getFriends(Long memberId, Pageable pageable) {
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<FriendResponse> friends = friendRepository.findAllByMemberId(memberId, fixedPageable)
                .map(friend -> friend.getFriendOf(memberId))
                .map(FriendResponse::from);
        return PageResponse.from(friends);
    }
}
