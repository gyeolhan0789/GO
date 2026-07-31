package com.wecandoit.bingo.client;

import java.time.Duration;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class AiVerificationClientImpl implements AiVerificationClient {

    private static final String VERIFY_PATH = "/mission/verify";
    private static final Duration CALL_TIMEOUT = Duration.ofSeconds(30);

    private final WebClient aiServerWebClient;

    public AiVerificationClientImpl(WebClient aiServerWebClient) {
        this.aiServerWebClient = aiServerWebClient;
    }

    @Override
    public AiVerificationResult verify(
            byte[] imageBytes,
            String fileName,
            String missionType,
            String decisionCondition
    ) {
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        // ai-server가 확장자로 이미지 형식을 검증하므로 저장된 파일명을 그대로 전달한다.
        bodyBuilder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return fileName;
            }
        }).contentType(MediaType.APPLICATION_OCTET_STREAM);
        bodyBuilder.part("mission_type", missionType);
        bodyBuilder.part("decision_condition", decisionCondition);

        return aiServerWebClient.post()
                .uri(VERIFY_PATH)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                .retrieve()
                .bodyToMono(AiVerificationResult.class)
                .block(CALL_TIMEOUT);
    }
}
