package com.wecandoit.item.controller;

import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.service.ShopItemQueryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/shop/items")
@RequiredArgsConstructor
public class ShopItemController {

    private final ShopItemQueryService shopItemQueryService;

    @GetMapping
    public ResponseEntity<List<ShopItemResponse>> getShopItems(
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(shopItemQueryService.getShopItems(category));
    }
}
