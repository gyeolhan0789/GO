package com.wecandoit.bingo.client;

public interface AiVerificationClient {

    AiVerificationResult verify(byte[] imageBytes, String fileName, String missionType, String decisionCondition);
}
