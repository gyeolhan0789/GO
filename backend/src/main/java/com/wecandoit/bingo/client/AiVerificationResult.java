package com.wecandoit.bingo.client;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiVerificationResult(
        String status,
        double confidence,
        @JsonProperty("reason_code") String reasonCode,
        String reason
) {

    private static final String SUCCESS_STATUS = "SUCCESS";

    public boolean success() {
        return SUCCESS_STATUS.equals(status);
    }
}
