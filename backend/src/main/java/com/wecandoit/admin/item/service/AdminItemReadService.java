package com.wecandoit.admin.item.service;

import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.repository.ItemRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminItemReadService {

    private final ItemRepository itemRepository;

    public List<AdminItemResponse> getItems() {
        return itemRepository.findAll().stream()
                .map(AdminItemResponse::from)
                .toList();
    }

    public AdminItemResponse getItem(Long itemId) {
        return itemRepository.findById(itemId)
                .map(AdminItemResponse::from)
                .orElseThrow(() -> new CustomException(ErrorCode.ITEM_NOT_FOUND));
    }
}
