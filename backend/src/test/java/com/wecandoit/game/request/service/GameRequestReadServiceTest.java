package com.wecandoit.game.request.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.request.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.request.controller.response.SentGameRequestResponse;
import com.wecandoit.game.request.domain.GameRequest;
import com.wecandoit.game.request.repository.GameRequestRepository;
import com.wecandoit.member.service.MemberReadService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임방 초대 요청 조회 서비스")
class GameRequestReadServiceTest {

    private final GameRequestRepository gameRequestRepository = Mockito.mock(GameRequestRepository.class);
    private final MemberReadService memberReadService = Mockito.mock(MemberReadService.class);
    private final GameRequestReadService gameRequestReadService = new GameRequestReadService(
            gameRequestRepository,
            memberReadService
    );

    @Test
    @DisplayName("받은 대기 중 게임방 초대 요청 목록을 초대한 회원 닉네임과 함께 반환한다")
    void getReceivedGameRequestsReturnsPendingRequestsWithInviterNickname() {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        GameRequest gameRequest = gameRequest(20L, 10L, 2L, 1L);
        ReflectionTestUtils.setField(gameRequest, "createdAt", createdAt);
        when(gameRequestRepository.findAllByInviteeIdAndStatusOrderByCreatedAtDesc(1L, RequestStatus.PENDING))
                .thenReturn(List.of(gameRequest));
        when(memberReadService.getNicknamesByIds(List.of(2L))).thenReturn(Map.of(2L, "초대자"));

        // when
        List<ReceivedGameRequestResponse> responses = gameRequestReadService.getReceivedGameRequests(1L);

        // then
        assertThat(responses).hasSize(1);
        ReceivedGameRequestResponse response = responses.getFirst();
        assertThat(response.requestId()).isEqualTo(20L);
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.inviterId()).isEqualTo(2L);
        assertThat(response.inviterNickname()).isEqualTo("초대자");
        assertThat(response.status()).isEqualTo(RequestStatus.PENDING);
        assertThat(response.createdAt()).isEqualTo(createdAt);
    }

    @Test
    @DisplayName("받은 게임방 초대 요청이 없으면 빈 목록을 반환한다")
    void getReceivedGameRequestsReturnsEmptyList() {
        // given
        when(gameRequestRepository.findAllByInviteeIdAndStatusOrderByCreatedAtDesc(1L, RequestStatus.PENDING))
                .thenReturn(List.of());

        // when
        List<ReceivedGameRequestResponse> responses = gameRequestReadService.getReceivedGameRequests(1L);

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("초대한 회원을 찾을 수 없으면 실패한다")
    void getReceivedGameRequestsRejectsMissingInviter() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 2L, 1L);
        when(gameRequestRepository.findAllByInviteeIdAndStatusOrderByCreatedAtDesc(1L, RequestStatus.PENDING))
                .thenReturn(List.of(gameRequest));
        when(memberReadService.getNicknamesByIds(List.of(2L)))
                .thenThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        // when, then
        assertThatThrownBy(() -> gameRequestReadService.getReceivedGameRequests(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
    }

    @Test
    @DisplayName("보낸 대기 중 게임방 초대 요청 목록을 초대받은 회원 닉네임과 함께 반환한다")
    void getSentGameRequestsReturnsPendingRequestsWithInviteeNickname() {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        ReflectionTestUtils.setField(gameRequest, "createdAt", createdAt);
        when(gameRequestRepository.findAllByInviterIdAndStatusOrderByCreatedAtDesc(1L, RequestStatus.PENDING))
                .thenReturn(List.of(gameRequest));
        when(memberReadService.getNicknamesByIds(List.of(2L))).thenReturn(Map.of(2L, "초대받은사람"));

        // when
        List<SentGameRequestResponse> responses = gameRequestReadService.getSentGameRequests(1L);

        // then
        assertThat(responses).hasSize(1);
        SentGameRequestResponse response = responses.getFirst();
        assertThat(response.requestId()).isEqualTo(20L);
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.inviteeId()).isEqualTo(2L);
        assertThat(response.inviteeNickname()).isEqualTo("초대받은사람");
        assertThat(response.status()).isEqualTo(RequestStatus.PENDING);
        assertThat(response.createdAt()).isEqualTo(createdAt);
    }

    @Test
    @DisplayName("보낸 게임방 초대 요청이 없으면 빈 목록을 반환한다")
    void getSentGameRequestsReturnsEmptyList() {
        // given
        when(gameRequestRepository.findAllByInviterIdAndStatusOrderByCreatedAtDesc(1L, RequestStatus.PENDING))
                .thenReturn(List.of());

        // when
        List<SentGameRequestResponse> responses = gameRequestReadService.getSentGameRequests(1L);

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("초대받은 회원을 찾을 수 없으면 실패한다")
    void getSentGameRequestsRejectsMissingInvitee() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        when(gameRequestRepository.findAllByInviterIdAndStatusOrderByCreatedAtDesc(1L, RequestStatus.PENDING))
                .thenReturn(List.of(gameRequest));
        when(memberReadService.getNicknamesByIds(List.of(2L)))
                .thenThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        // when, then
        assertThatThrownBy(() -> gameRequestReadService.getSentGameRequests(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
    }

    private GameRequest gameRequest(Long id, Long roomId, Long inviterId, Long inviteeId) {
        GameRequest gameRequest = GameRequest.create(roomId, inviterId, inviteeId);
        ReflectionTestUtils.setField(gameRequest, "id", id);
        return gameRequest;
    }
}
