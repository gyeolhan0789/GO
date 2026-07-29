package com.wecandoit.admin.item.service;

import com.wecandoit.admin.item.controller.request.CreateAdminItemRequest;
import com.wecandoit.admin.item.controller.request.UpdateAdminItemRequest;
import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.repository.ItemRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminItemCommandService {

    private static final String ITEM_IMAGE_DOMAIN = "items";

    private final ItemRepository itemRepository;
    private final ImageUploadService imageUploadService;

    public AdminItemResponse createItem(CreateAdminItemRequest request, MultipartFile image) {
        ItemCategory category = parseCategory(request.category());
        String resourceId = UUID.randomUUID().toString();
        String imageUrl = imageUploadService.upload(image, ITEM_IMAGE_DOMAIN, resourceId);
        Item item = itemRepository.save(Item.create(
                request.name(),
                category.name(),
                request.price(),
                imageUrl
        ));
        return AdminItemResponse.from(item);
    }

    public AdminItemResponse updateItem(
            Long itemId,
            UpdateAdminItemRequest request,
            MultipartFile image
    ) {
        Item item = findItem(itemId);
        ItemCategory category = parseCategory(request.category());
        String previousImageUrl = item.getImageUrl();
        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            imageUrl = imageUploadService.upload(image, ITEM_IMAGE_DOMAIN, itemId.toString());
        }
        item.update(
                request.name(),
                category.name(),
                request.price(),
                imageUrl,
                request.availableForSale()
        );
        if (imageUrl != null) {
            imageUploadService.delete(previousImageUrl);
        }
        return AdminItemResponse.from(item);
    }

    public void stopItemSale(Long itemId) {
        findItem(itemId).stopSale();
    }

    private Item findItem(Long itemId) {
        return itemRepository.findById(itemId)
                .orElseThrow(() -> new CustomException(ErrorCode.ITEM_NOT_FOUND));
    }

    private ItemCategory parseCategory(String category) {
        try {
            return ItemCategory.valueOf(category);
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_ITEM_CATEGORY);
        }
    }
}
