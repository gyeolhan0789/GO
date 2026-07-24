package com.wecandoit.bingo.client;

public record AiVerificationResult(
        boolean success,
        double confidence,
        String reason
) {
}
