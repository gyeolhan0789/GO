package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("미션 검증 Facade")
class MissionVerificationFacadeTest {

    private static final Long MEMBER_ID = 1L;
    private static final Long ROOM_ID = 10L;
    private static final Long CELL_ID = 1000L;
    private static final Long MISSION_ID = 5L;
    private static final String SUBMIT_URL = "https://example.com/proof.png";
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
        when(aiVerificationClient.downloadImage(anyString())).thenReturn(new byte[]{1, 2, 3});
        when(aiVerificationClient.verify(any(), any(), any()))
                .thenReturn(new AiVerificationResult(true, 0.85, "통과"));
        doReturn(30L).when(verificationResultService)
                .applyResult(CELL_ID, true, null, MissionType.OBJECT);

        // when
        BingoCellSubmitResponse response = facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, SUBMIT_URL);

        // then
        verify(verificationResultService).applyResult(eq(CELL_ID), eq(true), isNull(), eq(MissionType.OBJECT));
        assertThat(response.rewardCash()).isEqualTo(30L);
    }

    @Test
    @DisplayName("성공 응답이지만 신뢰도가 기준 미만이면 AI 사유가 아닌 신뢰도 미달 사유로 거절한다")
    void rejectsWithLowConfidenceReasonWhenConfidenceBelowThreshold() {
        // given
        stubSubmitAndLookup();
        when(aiVerificationClient.downloadImage(anyString())).thenReturn(new byte[]{1, 2, 3});
        when(aiVerificationClient.verify(any(), any(), any()))
                .thenReturn(new AiVerificationResult(true, 0.5, AI_REASON));

        // when
        facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, SUBMIT_URL);

        // then
        ArgumentCaptor<String> reasonCaptor = ArgumentCaptor.forClass(String.class);
        verify(verificationResultService).applyResult(
                eq(CELL_ID),
                eq(false),
                reasonCaptor.capture(),
                eq(MissionType.OBJECT)
        );
        assertThat(reasonCaptor.getValue())
                .isNotEqualTo(AI_REASON)
                .isEqualTo("AI 검증 신뢰도가 기준(0.7)에 미달했습니다.");
    }

    @Test
    @DisplayName("AI가 실패로 판정하면 AI가 준 사유를 그대로 거절 사유로 반영한다")
    void rejectsWithAiReasonWhenAiReturnsFailure() {
        // given
        stubSubmitAndLookup();
        when(aiVerificationClient.downloadImage(anyString())).thenReturn(new byte[]{1, 2, 3});
        when(aiVerificationClient.verify(any(), any(), any()))
                .thenReturn(new AiVerificationResult(false, 0.9, AI_REASON));

        // when
        facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, SUBMIT_URL);

        // then
        verify(verificationResultService).applyResult(CELL_ID, false, AI_REASON, MissionType.OBJECT);
    }

    @Test
    @DisplayName("AI 호출이 실패하면 셀을 거절 상태로 복구하고 AI_VERIFICATION_FAILED를 던진다")
    void rejectsCellAndThrowsWhenAiCallFails() {
        // given
        when(bingoCommandService.submitCell(MEMBER_ID, ROOM_ID, CELL_ID, SUBMIT_URL)).thenReturn(pendingCell());
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission()));
        when(aiVerificationClient.downloadImage(anyString())).thenReturn(new byte[]{1, 2, 3});
        when(aiVerificationClient.verify(any(), any(), any()))
                .thenThrow(new RuntimeException("timeout"));

        // when, then
        assertThatThrownBy(() -> facade.submitAndVerify(MEMBER_ID, ROOM_ID, CELL_ID, SUBMIT_URL))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.AI_VERIFICATION_FAILED);
        verify(verificationResultService)
                .applyResult(CELL_ID, false, ErrorCode.AI_VERIFICATION_FAILED.getMessage(), MissionType.OBJECT);
    }

    private void stubSubmitAndLookup() {
        BingoCell cell = pendingCell();
        when(bingoCommandService.submitCell(MEMBER_ID, ROOM_ID, CELL_ID, SUBMIT_URL)).thenReturn(cell);
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission()));
        when(bingoCellRepository.findById(CELL_ID)).thenReturn(Optional.of(cell));
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
                "OBJECT",
                "미션 제목",
                "미션 설명",
                "{\"target\":\"cup\"}"
        );
        ReflectionTestUtils.setField(mission, "id", MISSION_ID);
        return mission;
    }
}
