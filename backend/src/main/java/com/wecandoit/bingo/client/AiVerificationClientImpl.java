package com.wecandoit.bingo.client;

import java.net.URI;
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
    private static final String IMAGE_FILENAME = "submission";
    private static final Duration CALL_TIMEOUT = Duration.ofSeconds(30);

    private final WebClient aiServerWebClient;
    // submitUrl은 ai-server base-url과 무관한 외부 공개 URL이므로 base-url에 바인딩되지 않은 클라이언트로 절대 URL을 호출한다.
    private final WebClient imageWebClient = WebClient.create();

    public AiVerificationClientImpl(WebClient aiServerWebClient) {
        this.aiServerWebClient = aiServerWebClient;
    }

    @Override
    public byte[] downloadImage(String imageUrl) {
        return imageWebClient.get()
                .uri(URI.create(imageUrl))
                .retrieve()
                .bodyToMono(byte[].class)
                .block(CALL_TIMEOUT);
    }

    @Override
    public AiVerificationResult verify(byte[] imageBytes, String missionType, String decisionCondition) {
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return IMAGE_FILENAME;
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
