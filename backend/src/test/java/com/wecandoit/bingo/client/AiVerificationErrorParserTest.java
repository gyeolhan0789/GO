package com.wecandoit.bingo.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("AI 검증 오류 파서")
class AiVerificationErrorParserTest {

    @Test
    @DisplayName("FastAPI detail 문자열을 추출한다")
    void extractsFastApiDetailMessage() {
        String detail = AiVerificationErrorParser.extractDetail(
                "{\"detail\":\"decision_condition.target가 없습니다.\"}"
        );

        assertThat(detail).isEqualTo("decision_condition.target가 없습니다.");
    }

    @Test
    @DisplayName("4xx 응답은 잘못된 요청 오류로 변환한다")
    void mapsClientErrorToRequestInvalid() {
        CustomException exception = AiVerificationErrorParser.toClientException(
                400,
                "{\"detail\":\"decision_condition.target가 없습니다.\"}"
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.AI_VERIFICATION_REQUEST_INVALID);
        assertThat(exception.getMessage()).isEqualTo("decision_condition.target가 없습니다.");
    }

    @Test
    @DisplayName("5xx 응답은 AI 서버 오류로 변환한다")
    void mapsServerErrorToServerErrorCode() {
        CustomException exception = AiVerificationErrorParser.toClientException(
                500,
                "{\"detail\":\"AI 서버 내부 오류가 발생했습니다.\"}"
        );

        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.AI_VERIFICATION_SERVER_ERROR);
        assertThat(exception.getMessage()).isEqualTo("AI 서버 내부 오류가 발생했습니다.");
    }
}
