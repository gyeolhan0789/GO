package com.wecandoit.item.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.item.controller.response.ItemPurchaseResponse;
import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.service.ShopItemCommandService;
import com.wecandoit.item.service.ShopItemReadService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/shop/items")
@RequiredArgsConstructor
public class ShopItemController {

    private final ShopItemReadService shopItemReadService;
    private final ShopItemCommandService shopItemCommandService;

    @GetMapping
    public ResponseEntity<List<ShopItemResponse>> getShopItems(
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(shopItemReadService.getShopItems(category));
    }

    @PostMapping("/{itemId}/purchase")
    public ResponseEntity<ItemPurchaseResponse> purchaseItem(
            @LoginMemberId Long memberId,
            @PathVariable Long itemId
    ) {
        ItemPurchaseResponse response = shopItemCommandService.purchaseItem(memberId, itemId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
