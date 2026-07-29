package com.wecandoit.ranking.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import com.wecandoit.ranking.controller.response.RankingResponse;
import com.wecandoit.ranking.service.FriendRankingReadService;
import com.wecandoit.ranking.service.RankingReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingReadService rankingReadService;
    private final FriendRankingReadService friendRankingReadService;

    @GetMapping
    public ResponseEntity<RankingResponse> getRankings(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(rankingReadService.getRankings(memberId, pageable));
    }

    @GetMapping("/friends")
    public ResponseEntity<FriendRankingResponse> getFriendRankings(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(friendRankingReadService.getFriendRankings(memberId, pageable));
    }
}
