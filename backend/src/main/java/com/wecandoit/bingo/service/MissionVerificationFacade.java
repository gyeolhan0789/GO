package com.wecandoit.bingo.service;

import com.wecandoit.bingo.client.AiVerificationClient;
import com.wecandoit.bingo.client.AiVerificationResult;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 셀 제출(PENDING 저장) → AI 검증 호출 → 검증 결과 반영을 조율한다.
 * 외부 HTTP 호출을 DB 트랜잭션 밖에서 수행하기 위해 트랜잭션 서비스들을 순차적으로 호출하는 Facade이며,
 * 클래스 자체에는 {@code @Transactional}을 선언하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class MissionVerificationFacade {

    private static final double CONFIDENCE_THRESHOLD = 0.7;
    private static final String LOW_CONFIDENCE_REASON = "AI 검증 신뢰도가 기준(0.7)에 미달했습니다.";

    private final BingoService bingoService;
    private final AiVerificationClient aiVerificationClient;
    private final BingoCellVerificationResultService verificationResultService;
    private final MissionRepository missionRepository;
    private final BingoCellRepository bingoCellRepository;

    public BingoCellResponse submitAndVerify(Long memberId, Long roomId, Long cellId, String submitUrl) {
        BingoCell submittedCell = bingoService.submitCell(memberId, roomId, cellId, submitUrl);
        Mission mission = missionRepository.findById(submittedCell.getMissionId())
                .orElseThrow(() -> new CustomException(ErrorCode.MISSION_NOT_FOUND));

        AiVerificationResult result = requestVerification(submittedCell.getSubmitUrl(), mission);

        boolean approved = result.success() && result.confidence() >= CONFIDENCE_THRESHOLD;
        verificationResultService.applyResult(cellId, approved, resolveRejectionReason(result, approved));

        BingoCell verifiedCell = bingoCellRepository.findById(cellId)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));
        return BingoCellResponse.of(verifiedCell, mission);
    }

    private AiVerificationResult requestVerification(String submitUrl, Mission mission) {
        try {
            byte[] imageBytes = aiVerificationClient.downloadImage(submitUrl);
            return aiVerificationClient.verify(imageBytes, mission.getType(), mission.getDecisionCondition());
        } catch (RuntimeException e) {
            throw new CustomException(ErrorCode.AI_VERIFICATION_FAILED);
        }
    }

    private String resolveRejectionReason(AiVerificationResult result, boolean approved) {
        if (approved) {
            return null;
        }
        if (!result.success()) {
            return result.reason();
        }
        return LOW_CONFIDENCE_REASON;
    }
}
