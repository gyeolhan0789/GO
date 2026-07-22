package com.wecandoit.game.request.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.request.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.request.domain.GameRequest;
import com.wecandoit.game.request.repository.GameRequestRepository;
import com.wecandoit.member.service.MemberReadService;
import java.util.List;
import java.util.Map;
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

        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(gameRequests);

        return gameRequests.stream()
                .map(gameRequest -> ReceivedGameRequestResponse.from(
                        gameRequest,
                        getInviterNickname(nicknamesByMemberId, gameRequest.getInviterId())
                ))
                .toList();
    }

    private Map<Long, String> getNicknamesByMemberId(List<GameRequest> gameRequests) {
        List<Long> inviterIds = gameRequests.stream()
                .map(GameRequest::getInviterId)
                .distinct()
                .toList();
        return memberReadService.getNicknamesByIds(inviterIds);
    }

    private String getInviterNickname(Map<Long, String> nicknamesByMemberId, Long inviterId) {
        String nickname = nicknamesByMemberId.get(inviterId);
        if (nickname == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return nickname;
    }
}
