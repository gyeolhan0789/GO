package com.wecandoit.common.storage;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@RequiredArgsConstructor
public class LocalImageUploadService implements ImageUploadService {

    private static final String UPLOAD_URL_PREFIX = "/uploads";
    private static final String DEFAULT_PROFILE = "default";
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> ALLOWED_CONTENT_TYPE_EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png"
    );

    private final StorageProperties storageProperties;
    private final Environment environment;

    @Override
    public String upload(MultipartFile file, String domain, String resourceId) {
        String extension = resolveExtension(file);
        String activeProfile = resolveActiveProfile();
        String fileName = UUID.randomUUID() + "." + extension;

        Path targetDirectory = Path.of(storageProperties.rootPath(), activeProfile, domain, resourceId);
        Path targetPath = targetDirectory.resolve(fileName);
        try {
            Files.createDirectories(targetDirectory);
            file.transferTo(targetPath);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        return String.join("/", UPLOAD_URL_PREFIX, activeProfile, domain, resourceId, fileName);
    }

    @Override
    public void delete(String url) {
        if (url == null || !url.startsWith(UPLOAD_URL_PREFIX + "/")) {
            return;
        }

        Path root = Path.of(storageProperties.rootPath()).toAbsolutePath().normalize();
        String relativePath = url.substring(UPLOAD_URL_PREFIX.length() + 1);
        Path targetPath = root.resolve(relativePath).normalize();
        if (!targetPath.startsWith(root)) {
            return;
        }

        try {
            Files.deleteIfExists(targetPath);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private String resolveExtension(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new CustomException(ErrorCode.IMAGE_TOO_LARGE);
        }

        String contentType = file.getContentType();
        String extension = contentType == null ? null : ALLOWED_CONTENT_TYPE_EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new CustomException(ErrorCode.INVALID_IMAGE_TYPE);
        }
        return extension;
    }

    private String resolveActiveProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        return activeProfiles.length > 0 ? activeProfiles[0] : DEFAULT_PROFILE;
    }
}
