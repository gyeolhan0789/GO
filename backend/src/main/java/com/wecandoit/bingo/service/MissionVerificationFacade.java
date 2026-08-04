package com.wecandoit.bingo.service;

import com.wecandoit.bingo.client.AiVerificationClient;
import com.wecandoit.bingo.client.AiVerificationResult;
import com.wecandoit.bingo.controller.response.BingoCellSubmitResponse;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.repository.MissionRepository;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * 셀 제출(이미지 저장 + PENDING 저장) → AI 검증 호출 → 검증 결과 반영을 조율한다.
 * 외부 HTTP 호출을 DB 트랜잭션 밖에서 수행하기 위해 트랜잭션 서비스들을 순차적으로 호출하는 Facade이며,
 * 클래스 자체에는 {@code @Transactional}을 선언하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class MissionVerificationFacade {

    private static final double CONFIDENCE_THRESHOLD = 0.7;
    private static final String LOW_CONFIDENCE_REASON = "AI 검증 신뢰도가 기준(0.7)에 미달했습니다.";

    private final BingoCommandService bingoCommandService;
    private final AiVerificationClient aiVerificationClient;
    private final BingoCellVerificationResultService verificationResultService;
    private final MissionRepository missionRepository;
    private final BingoCellRepository bingoCellRepository;

    public BingoCellSubmitResponse submitAndVerify(Long memberId, Long roomId, Long cellId, MultipartFile image) {
        return submitAndVerify(memberId, roomId, cellId, image, null);
    }

    public BingoCellSubmitResponse submitAndVerify(
            Long memberId,
            Long roomId,
            Long cellId,
            MultipartFile image,
            UUID clientSessionKey
    ) {
        // 저장 과정의 transferTo가 업로드 스트림을 소비할 수 있으므로 반드시 저장 전에 바이트를 확보한다.
        byte[] imageBytes = readImageBytes(image);
        BingoCell submittedCell = clientSessionKey == null
                ? bingoCommandService.submitCell(memberId, roomId, cellId, image)
                : bingoCommandService.submitCell(memberId, roomId, cellId, image, clientSessionKey);
        Mission mission = missionRepository.findById(submittedCell.getMissionId())
                .orElseThrow(() -> new CustomException(ErrorCode.MISSION_NOT_FOUND));
        MissionDifficulty missionDifficulty = mission.getDifficulty();

        AiVerificationResult result;
        try {
            result = requestVerification(imageBytes, resolveFileName(submittedCell.getSubmitUrl()), mission);
        } catch (CustomException e) {
            verificationResultService.applyResult(cellId, false, resolveFailureReason(e), missionDifficulty);
            throw e;
        }

        boolean approved = result.success() && result.confidence() >= CONFIDENCE_THRESHOLD;
        long rewardPoint = verificationResultService.applyResult(
                cellId,
                approved,
                resolveRejectionReason(result, approved),
                missionDifficulty
        );

        BingoCell verifiedCell = bingoCellRepository.findById(cellId)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));
        return BingoCellSubmitResponse.of(verifiedCell, mission, rewardPoint);
    }

    private byte[] readImageBytes(MultipartFile image) {
        try {
            return image.getBytes();
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String resolveFileName(String submitUrl) {
        return submitUrl.substring(submitUrl.lastIndexOf('/') + 1);
    }

    private AiVerificationResult requestVerification(byte[] imageBytes, String fileName, Mission mission) {
        try {
            return aiVerificationClient.verify(
                    imageBytes,
                    fileName,
                    mission.getType().name(),
                    mission.getDecisionCondition()
            );
        } catch (CustomException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new CustomException(ErrorCode.AI_VERIFICATION_FAILED);
        }
    }

    private String resolveFailureReason(CustomException exception) {
        if (exception.getMessage() != null && !exception.getMessage().isBlank()) {
            return exception.getMessage();
        }
        return exception.getErrorCode().getMessage();
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
