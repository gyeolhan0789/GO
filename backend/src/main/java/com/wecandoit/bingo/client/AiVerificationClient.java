package com.wecandoit.bingo.client;

public interface AiVerificationClient {

    byte[] downloadImage(String imageUrl);

    AiVerificationResult verify(byte[] imageBytes, String missionType, String decisionCondition);
}
