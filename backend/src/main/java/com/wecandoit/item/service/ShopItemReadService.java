package com.wecandoit.item.service;

import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.repository.ItemRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShopItemReadService {

    private final ItemRepository itemRepository;

    public List<ShopItemResponse> getShopItems() {
        return getShopItems(null);
    }

    public List<ShopItemResponse> getShopItems(String category) {
        ItemCategory itemCategory = category == null ? null : ItemCategory.from(category);
        return findItems(itemCategory).stream()
                .map(ShopItemResponse::from)
                .toList();
    }

    private List<Item> findItems(ItemCategory category) {
        if (category == null) {
            return itemRepository.findAllByAvailableForSaleTrue();
        }
        return itemRepository.findAllByCategoryAndAvailableForSaleTrue(category);
    }
}
