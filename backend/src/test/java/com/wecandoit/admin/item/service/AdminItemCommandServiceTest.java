package com.wecandoit.admin.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.admin.item.controller.request.CreateAdminItemRequest;
import com.wecandoit.admin.item.controller.request.UpdateAdminItemRequest;
import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.repository.ItemRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@DisplayName("어드민 아이템 변경 서비스")
class AdminItemCommandServiceTest {

    @Mock
    private ItemRepository itemRepository;
    @Mock
    private ImageUploadService imageUploadService;
    @Mock
    private MultipartFile image;
    private AdminItemCommandService adminItemCommandService;

    @BeforeEach
    void setUp() {
        adminItemCommandService = new AdminItemCommandService(itemRepository, imageUploadService);
    }

    @Test
    @DisplayName("아이템을 등록하면 이미지를 저장하고 판매 가능 상태로 생성한다")
    void createItemUploadsImageAndSavesAvailableItem() {
        // given
        CreateAdminItemRequest request = new CreateAdminItemRequest("검은 모자", "HAT", 1_000L);
        given(imageUploadService.upload(
                ArgumentMatchers.eq(image),
                ArgumentMatchers.eq("items"),
                ArgumentMatchers.anyString()
        )).willReturn("/uploads/test/items/resource/hat.png");
        given(itemRepository.save(ArgumentMatchers.any(Item.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        AdminItemResponse response = adminItemCommandService.createItem(request, image);

        // then
        assertThat(response.name()).isEqualTo("검은 모자");
        assertThat(response.category()).isEqualTo(ItemCategory.HAT);
        assertThat(response.price()).isEqualTo(1_000L);
        assertThat(response.imageUrl()).isEqualTo("/uploads/test/items/resource/hat.png");
        assertThat(response.availableForSale()).isTrue();
    }

    @Test
    @DisplayName("아이템 정보를 수정하면서 판매 중지 아이템을 다시 판매한다")
    void updateItemChangesFieldsAndRestartsSale() {
        // given
        Item item = item(1L, "이전 모자", ItemCategory.HAT, "/old.png");
        item.stopSale();
        UpdateAdminItemRequest request =
                new UpdateAdminItemRequest("새 모자", "ACCESSORY", 2_000L, true);
        given(itemRepository.findById(1L)).willReturn(Optional.of(item));
        given(image.isEmpty()).willReturn(true);

        // when
        AdminItemResponse response = adminItemCommandService.updateItem(1L, request, image);

        // then
        assertThat(response.name()).isEqualTo("새 모자");
        assertThat(response.category()).isEqualTo(ItemCategory.ACCESSORY);
        assertThat(response.price()).isEqualTo(2_000L);
        assertThat(response.imageUrl()).isEqualTo("/old.png");
        assertThat(response.availableForSale()).isTrue();
        then(imageUploadService).should(never()).upload(
                ArgumentMatchers.any(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }

    @Test
    @DisplayName("새 이미지로 수정하면 기존 로컬 이미지를 삭제한다")
    void updateItemReplacesImage() {
        // given
        Item item = item(1L, "모자", ItemCategory.HAT, "/uploads/test/items/1/old.png");
        UpdateAdminItemRequest request = new UpdateAdminItemRequest("모자", "HAT", 1_000L, true);
        given(itemRepository.findById(1L)).willReturn(Optional.of(item));
        given(image.isEmpty()).willReturn(false);
        given(imageUploadService.upload(image, "items", "1"))
                .willReturn("/uploads/test/items/1/new.png");

        // when
        AdminItemResponse response = adminItemCommandService.updateItem(1L, request, image);

        // then
        assertThat(response.imageUrl()).isEqualTo("/uploads/test/items/1/new.png");
        then(imageUploadService).should().delete("/uploads/test/items/1/old.png");
    }

    @Test
    @DisplayName("아이템 삭제 요청은 물리 삭제 대신 판매를 중지한다")
    void stopItemSaleMarksItemUnavailable() {
        // given
        Item item = item(1L, "모자", ItemCategory.HAT, "/hat.png");
        given(itemRepository.findById(1L)).willReturn(Optional.of(item));

        // when
        adminItemCommandService.stopItemSale(1L);

        // then
        assertThat(item.isAvailableForSale()).isFalse();
        then(itemRepository).should(never()).delete(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("유효하지 않은 카테고리로 아이템을 등록하면 실패한다")
    void createItemRejectsInvalidCategory() {
        // given
        CreateAdminItemRequest request = new CreateAdminItemRequest("모자", "UNKNOWN", 1_000L);

        // when & then
        assertThatThrownBy(() -> adminItemCommandService.createItem(request, image))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        then(imageUploadService).should(never()).upload(
                ArgumentMatchers.any(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()
        );
    }
}
