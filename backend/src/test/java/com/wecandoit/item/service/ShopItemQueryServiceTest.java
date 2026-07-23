package com.wecandoit.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.repository.ItemRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("상점 아이템 조회 서비스")
class ShopItemQueryServiceTest {

    private final ItemRepository itemRepository = Mockito.mock(ItemRepository.class);
    private final ShopItemQueryService shopItemQueryService = new ShopItemQueryService(itemRepository);

    @Test
    @DisplayName("전체 상점 아이템 목록을 응답 정보로 변환해 반환한다")
    void getShopItemsReturnsAllItems() {
        // given
        Item hat = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        Item top = item(200L, "파란 상의", "TOP", "https://example.com/top.png");
        ReflectionTestUtils.setField(hat, "price", 1_000L);
        ReflectionTestUtils.setField(top, "price", 2_000L);
        when(itemRepository.findAll()).thenReturn(List.of(hat, top));

        // when
        List<ShopItemResponse> responses = shopItemQueryService.getShopItems();

        // then
        assertThat(responses)
                .extracting("itemId", "name", "category", "price", "imageUrl")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                100L,
                                "빨간 모자",
                                "HAT",
                                1_000L,
                                "https://example.com/hat.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                200L,
                                "파란 상의",
                                "TOP",
                                2_000L,
                                "https://example.com/top.png"
                        )
                );
        verify(itemRepository).findAll();
    }

    @Test
    @DisplayName("상점 아이템이 없으면 빈 목록을 반환한다")
    void getShopItemsReturnsEmptyList() {
        // given
        when(itemRepository.findAll()).thenReturn(List.of());

        // when
        List<ShopItemResponse> responses = shopItemQueryService.getShopItems();

        // then
        assertThat(responses).isEmpty();
        verify(itemRepository).findAll();
    }
}
