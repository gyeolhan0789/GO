package com.wecandoit.admin.item.controller;

import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.admin.item.service.AdminItemCommandService;
import com.wecandoit.admin.item.service.AdminItemReadService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/items")
@RequiredArgsConstructor
public class AdminItemController {

    private final AdminItemCommandService adminItemCommandService;
    private final AdminItemReadService adminItemReadService;

    @GetMapping
    public ResponseEntity<List<AdminItemResponse>> getItems() {
        return ResponseEntity.ok(adminItemReadService.getItems());
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<AdminItemResponse> getItem(@PathVariable Long itemId) {
        return ResponseEntity.ok(adminItemReadService.getItem(itemId));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> stopItemSale(@PathVariable Long itemId) {
        adminItemCommandService.stopItemSale(itemId);
        return ResponseEntity.noContent().build();
    }
}
