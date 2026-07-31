package com.wecandoit.admin.item.controller;

import com.wecandoit.admin.item.controller.request.CreateAdminItemRequest;
import com.wecandoit.admin.item.controller.request.UpdateAdminItemRequest;
import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.admin.item.service.AdminItemCommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/items")
@RequiredArgsConstructor
public class AdminItemImageController {

    private final AdminItemCommandService adminItemCommandService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminItemResponse> createItem(
            @Valid @ModelAttribute CreateAdminItemRequest request,
            @RequestPart("image") MultipartFile image
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminItemCommandService.createItem(request, image));
    }

    @PutMapping(value = "/{itemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminItemResponse> updateItem(
            @PathVariable Long itemId,
            @Valid @ModelAttribute UpdateAdminItemRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        return ResponseEntity.ok(adminItemCommandService.updateItem(itemId, request, image));
    }
}
