package com.wecandoit.item.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.item.controller.request.SaveEquippedItemsRequest;
import com.wecandoit.item.service.CharacterItemCommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/character-items")
@RequiredArgsConstructor
public class CharacterItemController {

    private final CharacterItemCommandService characterItemCommandService;

    @PutMapping
    public ResponseEntity<Void> saveEquippedItems(
            @LoginMemberId Long memberId,
            @Valid @RequestBody SaveEquippedItemsRequest request
    ) {
        characterItemCommandService.saveEquippedItems(memberId, request.memberItemIds());
        return ResponseEntity.noContent().build();
    }
}
