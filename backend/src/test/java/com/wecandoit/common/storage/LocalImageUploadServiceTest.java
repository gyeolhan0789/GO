package com.wecandoit.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockMultipartFile;

@DisplayName("로컬 이미지 업로드 서비스")
class LocalImageUploadServiceTest {

    @TempDir
    Path tempDir;

    private LocalImageUploadService localImageUploadService;

    @BeforeEach
    void setUp() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("test");
        localImageUploadService = new LocalImageUploadService(new StorageProperties(tempDir.toString()), environment);
    }

    @Test
    @DisplayName("PNG 이미지를 업로드하면 활성 프로필과 도메인이 포함된 URL을 반환한다")
    void uploadStoresValidPngFile() {
        // given
        MockMultipartFile file = new MockMultipartFile("image", "flower.png", "image/png", "png-bytes".getBytes());

        // when
        String imageUrl = localImageUploadService.upload(file, "missions", "resource-1");

        // then
        assertThat(imageUrl).startsWith("/uploads/test/missions/resource-1/");
        assertThat(imageUrl).endsWith(".png");
    }

    @Test
    @DisplayName("JPEG 이미지를 업로드하면 활성 프로필과 도메인이 포함된 URL을 반환한다")
    void uploadStoresValidJpegFile() {
        // given
        MockMultipartFile file = new MockMultipartFile("image", "flower.jpg", "image/jpeg", "jpg-bytes".getBytes());

        // when
        String imageUrl = localImageUploadService.upload(file, "missions", "resource-2");

        // then
        assertThat(imageUrl).startsWith("/uploads/test/missions/resource-2/");
        assertThat(imageUrl).endsWith(".jpg");
    }

    @Test
    @DisplayName("이미지가 아닌 파일을 업로드하면 예외가 발생한다")
    void uploadRejectsNonImageFile() {
        // given
        MockMultipartFile file = new MockMultipartFile("image", "doc.pdf", "application/pdf", "pdf-bytes".getBytes());

        // when & then
        assertThatThrownBy(() -> localImageUploadService.upload(file, "missions", "resource-1"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_IMAGE_TYPE);
    }

    @Test
    @DisplayName("최대 크기를 초과한 파일을 업로드하면 예외가 발생한다")
    void uploadRejectsOversizedFile() {
        // given
        byte[] oversizedContent = new byte[6 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile("image", "flower.png", "image/png", oversizedContent);

        // when & then
        assertThatThrownBy(() -> localImageUploadService.upload(file, "missions", "resource-1"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.IMAGE_TOO_LARGE);
    }

    @Test
    @DisplayName("존재하지 않는 경로를 삭제 요청해도 예외 없이 무시한다")
    void deleteIgnoresNonExistentPath() {
        // when & then
        assertThatCode(() -> localImageUploadService.delete("/uploads/test/missions/unknown/unknown.png"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("관리 대상이 아닌 URL을 삭제 요청해도 예외 없이 무시한다")
    void deleteIgnoresForeignUrl() {
        // when & then
        assertThatCode(() -> localImageUploadService.delete("https://external.example.com/image.png"))
                .doesNotThrowAnyException();
    }
}
