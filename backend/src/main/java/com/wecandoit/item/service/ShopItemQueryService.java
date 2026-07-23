package com.wecandoit.item.service;

import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.repository.ItemRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShopItemQueryService {

    private final ItemRepository itemRepository;

    public List<ShopItemResponse> getShopItems() {
        return itemRepository.findAll().stream()
                .map(ShopItemResponse::from)
                .toList();
    }
}
