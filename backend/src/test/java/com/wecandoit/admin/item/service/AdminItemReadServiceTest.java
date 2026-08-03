package com.wecandoit.admin.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.repository.ItemRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("어드민 아이템 조회 서비스")
class AdminItemReadServiceTest {

    @Mock
    private ItemRepository itemRepository;
    private AdminItemReadService adminItemReadService;

    @BeforeEach
    void setUp() {
        adminItemReadService = new AdminItemReadService(itemRepository);
    }

    @Test
    @DisplayName("판매 중지 여부와 관계없이 전체 아이템을 조회한다")
    void getItemsReturnsAllItems() {
        // given
        Item availableItem = item(1L, "판매 모자", ItemCategory.HAT, "/available.png");
        Item stoppedItem = item(2L, "판매 중지 모자", ItemCategory.HAT, "/stopped.png");
        stoppedItem.stopSale();
        given(itemRepository.findAll()).willReturn(List.of(availableItem, stoppedItem));

        // when
        List<AdminItemResponse> responses = adminItemReadService.getItems();

        // then
        assertThat(responses)
                .extracting(AdminItemResponse::itemId, AdminItemResponse::availableForSale)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, true),
                        org.assertj.core.groups.Tuple.tuple(2L, false)
                );
    }

    @Test
    @DisplayName("존재하지 않는 아이템을 상세 조회하면 실패한다")
    void getItemRejectsMissingItem() {
        // given
        given(itemRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> adminItemReadService.getItem(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ITEM_NOT_FOUND);
    }
}
