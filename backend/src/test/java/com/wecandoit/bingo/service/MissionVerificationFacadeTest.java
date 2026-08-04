package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.bingo.client.AiVerificationClient;
import com.wecandoit.bingo.client.AiVerificationResult;
import com.wecandoit.bingo.controller.response.BingoCellSubmitResponse;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("미션 검증 Facade")
class MissionVerificationFacadeTest {

    private static final Long MEMBER_ID = 1L;
    private static final Long ROOM_ID = 10L;
    private static final Long CELL_ID = 1000L;
    private static final Long MISSION_ID = 5L;
    private static final String STORED_FILE_NAME = "3f2504e0-4f89-11d3-9a0c-0305e82c3301.png";
    private static final String SUBMIT_URL = "/uploads/test/bingo-cells/1000/" + STORED_FILE_NAME;
    private static final String AI_REASON = "이미지에서 조건을 확인할 수 없습니다.";

    private final BingoCommandService bingoCommandService = Mockito.mock(BingoCommandService.class);
    private final AiVerificationClient aiVerificationClient = Mockito.mock(AiVerificationClient.class);
    private final BingoCellVerificationResultService verificationResultService =
            Mockito.mock(BingoCellVerificationResultService.class);
    private final MissionRepository missionRepository = Mockito.mock(MissionRepository.class);
    private final BingoCellRepository bingoCellRepository = Mockito.mock(BingoCellRepository.class);
    private final MissionVerificationFacade facade = new MissionVerificationFacade(
            bingoCommandService,
            aiVerificationClient,
            verificationResultService,
            missionRepository,
            bingoCellRepository
    );

    @Test
    @DisplayName("성공 응답이고 신뢰도가 기준 이상이면 승인 결과를 반영한다")
    void appliesApprovalWhenSuccessAndConfidenceMeetsThreshold() {
        // given
        stubSubmitAndLookup();
        when(aiVerificationClient.verify(any(), any(), any(), any()))
                .thenReturn(new AiVerificationResult("SUCCESS", 0.85, "PASS", "통과"));
        doReturn(30L).when(verificationResultService)
                .applyResult(CELL_ID, true, null, MissionDifficulty.LOW);

        // when
        BingoCellSubmitResponse response = facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, image());

        // then
        verify(verificationResultService).applyResult(eq(CELL_ID), eq(true), isNull(), eq(MissionDifficulty.LOW));
        assertThat(response.rewardPoint()).isEqualTo(30L);
    }

    @Test
    @DisplayName("업로드된 이미지 바이트와 저장된 파일명을 AI 서버로 전달한다")
    void sendsUploadedBytesAndStoredFileNameToAiServer() {
        // given
        stubSubmitAndLookup();
        when(aiVerificationClient.verify(any(), any(), any(), any()))
                .thenReturn(new AiVerificationResult("SUCCESS", 0.85, "PASS", "통과"));

        // when
        facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, image());

        // then
        ArgumentCaptor<byte[]> bytesCaptor = ArgumentCaptor.forClass(byte[].class);
        ArgumentCaptor<String> fileNameCaptor = ArgumentCaptor.forClass(String.class);
        verify(aiVerificationClient).verify(
                bytesCaptor.capture(),
                fileNameCaptor.capture(),
                eq("OBJECT"),
                eq("{\"target\":\"cup\"}")
        );
        assertThat(bytesCaptor.getValue()).isEqualTo(new byte[]{1, 2, 3});
        assertThat(fileNameCaptor.getValue()).isEqualTo(STORED_FILE_NAME);
    }

    @Test
    @DisplayName("성공 응답이지만 신뢰도가 기준 미만이면 AI 사유가 아닌 신뢰도 미달 사유로 거절한다")
    void rejectsWithLowConfidenceReasonWhenConfidenceBelowThreshold() {
        // given
        stubSubmitAndLookup();
        when(aiVerificationClient.verify(any(), any(), any(), any()))
                .thenReturn(new AiVerificationResult("SUCCESS", 0.5, "PASS", AI_REASON));

        // when
        facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, image());

        // then
        ArgumentCaptor<String> reasonCaptor = ArgumentCaptor.forClass(String.class);
        verify(verificationResultService).applyResult(
                eq(CELL_ID),
                eq(false),
                reasonCaptor.capture(),
                eq(MissionDifficulty.LOW)
        );
        assertThat(reasonCaptor.getValue())
                .isNotEqualTo(AI_REASON)
                .isEqualTo("제출한 사진으로는 미션 완료를 확인할 수 없어요. 사진을 다시 확인하고 재시도해 주세요.");
    }

    @Test
    @DisplayName("AI가 실패로 판정하면 AI가 준 사유를 그대로 거절 사유로 반영한다")
    void rejectsWithAiReasonWhenAiReturnsFailure() {
        // given
        stubSubmitAndLookup();
        when(aiVerificationClient.verify(any(), any(), any(), any()))
                .thenReturn(new AiVerificationResult("FAIL", 0.9, "OBJECT_UNCERTAIN", AI_REASON));

        // when
        facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, image());

        // then
        verify(verificationResultService).applyResult(CELL_ID, false, AI_REASON, MissionDifficulty.LOW);
    }

    @Test
    @DisplayName("AI 호출이 실패하면 셀을 거절 상태로 복구하고 AI_VERIFICATION_FAILED를 던진다")
    void rejectsCellAndThrowsWhenAiCallFails() {
        // given
        when(bingoCommandService.submitCell(eq(MEMBER_ID), eq(ROOM_ID), eq(CELL_ID), any(MultipartFile.class)))
                .thenReturn(pendingCell());
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission()));
        when(aiVerificationClient.verify(any(), any(), any(), any()))
                .thenThrow(new RuntimeException("timeout"));

        // when, then
        assertThatThrownBy(() -> facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, image()))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.AI_VERIFICATION_FAILED);
        verify(verificationResultService)
                .applyResult(CELL_ID, false, ErrorCode.AI_VERIFICATION_FAILED.getMessage(), MissionDifficulty.LOW);
    }

    @Test
    @DisplayName("AI 서버가 400을 반환하면 502 오류와 상세 사유를 전달한다")
    void propagatesRequestInvalidErrorFromAiServer() {
        // given
        when(bingoCommandService.submitCell(eq(MEMBER_ID), eq(ROOM_ID), eq(CELL_ID), any(MultipartFile.class)))
                .thenReturn(pendingCell());
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission()));
        when(aiVerificationClient.verify(any(), any(), any(), any()))
                .thenThrow(new CustomException(
                        ErrorCode.AI_VERIFICATION_REQUEST_INVALID,
                        "decision_condition.target가 없습니다."
                ));

        // when, then
        assertThatThrownBy(() -> facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, image()))
                .isInstanceOf(CustomException.class)
                .satisfies(exception -> {
                    CustomException customException = (CustomException) exception;
                    assertThat(customException.getErrorCode()).isEqualTo(ErrorCode.AI_VERIFICATION_REQUEST_INVALID);
                    assertThat(customException.getMessage()).isEqualTo("decision_condition.target가 없습니다.");
                });
        verify(verificationResultService)
                .applyResult(
                        CELL_ID,
                        false,
                        "decision_condition.target가 없습니다.",
                        MissionDifficulty.LOW
                );
    }

    private void stubSubmitAndLookup() {
        BingoCell cell = pendingCell();
        when(bingoCommandService.submitCell(eq(MEMBER_ID), eq(ROOM_ID), eq(CELL_ID), any(MultipartFile.class)))
                .thenReturn(cell);
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission()));
        when(bingoCellRepository.findById(CELL_ID)).thenReturn(Optional.of(cell));
    }

    private MultipartFile image() {
        return new MockMultipartFile("image", "proof.png", "image/png", new byte[]{1, 2, 3});
    }

    private BingoCell pendingCell() {
        BingoCell cell = BingoCell.create(100L, MISSION_ID, 0, 0);
        ReflectionTestUtils.setField(cell, "id", CELL_ID);
        cell.submit(MEMBER_ID, SUBMIT_URL);
        return cell;
    }

    private Mission mission() {
        Mission mission = Mission.create(
                "https://example.com/mission.png",
                MissionType.OBJECT,
                "미션 제목",
                "미션 설명",
                "{\"target\":\"cup\"}",
                MissionDifficulty.LOW
        );
        ReflectionTestUtils.setField(mission, "id", MISSION_ID);
        return mission;
    }
}
