package com.wecandoit.game.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.controller.response.SentGameRequestResponse;
import com.wecandoit.game.domain.GameRequest;
import com.wecandoit.game.repository.GameRequestRepository;
import com.wecandoit.member.service.MemberReadService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameRequestReadService {

    private final GameRequestRepository gameRequestRepository;
    private final MemberReadService memberReadService;

    public List<ReceivedGameRequestResponse> getReceivedGameRequests(Long memberId) {
        List<GameRequest> gameRequests = gameRequestRepository
                .findAllByInviteeIdAndStatusOrderByCreatedAtDesc(memberId, RequestStatus.PENDING);
        if (gameRequests.isEmpty()) {
            return List.of();
        }

        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(
                gameRequests,
                GameRequest::getInviterId
        );

        return gameRequests.stream()
                .map(gameRequest -> ReceivedGameRequestResponse.from(
                        gameRequest,
                        getNickname(nicknamesByMemberId, gameRequest.getInviterId())
                ))
                .toList();
    }

    public List<SentGameRequestResponse> getSentGameRequests(Long memberId) {
        List<GameRequest> gameRequests = gameRequestRepository
                .findAllByInviterIdAndStatusOrderByCreatedAtDesc(memberId, RequestStatus.PENDING);
        if (gameRequests.isEmpty()) {
            return List.of();
        }

        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(
                gameRequests,
                GameRequest::getInviteeId
        );

        return gameRequests.stream()
                .map(gameRequest -> SentGameRequestResponse.from(
                        gameRequest,
                        getNickname(nicknamesByMemberId, gameRequest.getInviteeId())
                ))
                .toList();
    }

    private Map<Long, String> getNicknamesByMemberId(
            List<GameRequest> gameRequests,
            Function<GameRequest, Long> memberIdExtractor
    ) {
        List<Long> memberIds = gameRequests.stream()
                .map(memberIdExtractor)
                .distinct()
                .toList();
        return memberReadService.getNicknamesByIds(memberIds);
    }

    private String getNickname(Map<Long, String> nicknamesByMemberId, Long memberId) {
        String nickname = nicknamesByMemberId.get(memberId);
        if (nickname == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return nickname;
    }
}
