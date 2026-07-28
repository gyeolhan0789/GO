package com.wecandoit.common.storage;

import org.springframework.web.multipart.MultipartFile;

public interface ImageUploadService {

    String upload(MultipartFile file, String domain, String resourceId);

    void delete(String url);
}
