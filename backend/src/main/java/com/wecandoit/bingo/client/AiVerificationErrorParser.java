package com.wecandoit.bingo.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;

final class AiVerificationErrorParser {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private AiVerificationErrorParser() {
    }

    static String extractDetail(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }

        try {
            JsonNode detail = OBJECT_MAPPER.readTree(body).get("detail");
            if (detail == null) {
                return body;
            }
            if (detail.isTextual()) {
                return detail.asText();
            }
            return detail.toString();
        } catch (Exception ignored) {
            return body;
        }
    }

    static CustomException toClientException(int statusCode, String body) {
        String detail = extractDetail(body);
        ErrorCode errorCode = statusCode >= 500
                ? ErrorCode.AI_VERIFICATION_SERVER_ERROR
                : ErrorCode.AI_VERIFICATION_REQUEST_INVALID;

        if (detail == null || detail.isBlank()) {
            return new CustomException(errorCode);
        }
        return new CustomException(errorCode, detail);
    }
}
