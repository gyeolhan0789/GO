package com.wecandoit.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.repository.ItemRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("상점 아이템 조회 서비스")
class ShopItemReadServiceTest {

    @Mock
    private ItemRepository itemRepository;
    private ShopItemReadService shopItemReadService;

    @BeforeEach
    void setUp() {
        shopItemReadService = new ShopItemReadService(itemRepository);
    }

    @Test
    @DisplayName("전체 상점 아이템 목록을 응답 정보로 변환해 반환한다")
    void getShopItemsReturnsAllItems() {
        // given
        Item hat = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        Item top = item(200L, "파란 상의", "TOP", "https://example.com/top.png");
        ReflectionTestUtils.setField(hat, "price", 1_000L);
        ReflectionTestUtils.setField(top, "price", 2_000L);
        given(itemRepository.findAllByAvailableForSaleTrue()).willReturn(List.of(hat, top));

        // when
        List<ShopItemResponse> responses = shopItemReadService.getShopItems();

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
        then(itemRepository).should().findAllByAvailableForSaleTrue();
    }

    @Test
    @DisplayName("상점 아이템이 없으면 빈 목록을 반환한다")
    void getShopItemsReturnsEmptyList() {
        // given
        given(itemRepository.findAllByAvailableForSaleTrue()).willReturn(List.of());

        // when
        List<ShopItemResponse> responses = shopItemReadService.getShopItems();

        // then
        assertThat(responses).isEmpty();
        then(itemRepository).should().findAllByAvailableForSaleTrue();
    }

    @Test
    @DisplayName("카테고리로 조회하면 해당 카테고리의 상점 아이템만 반환한다")
    void getShopItemsByCategoryReturnsMatchingItems() {
        // given
        Item hat = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        ReflectionTestUtils.setField(hat, "price", 1_000L);
        given(itemRepository.findAllByCategoryAndAvailableForSaleTrue("HAT")).willReturn(List.of(hat));

        // when
        List<ShopItemResponse> responses = shopItemReadService.getShopItems("HAT");

        // then
        assertThat(responses)
                .extracting(ShopItemResponse::itemId, ShopItemResponse::category)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(100L, "HAT"));
        then(itemRepository).should().findAllByCategoryAndAvailableForSaleTrue("HAT");
        then(itemRepository).should(never()).findAllByAvailableForSaleTrue();
    }

    @Test
    @DisplayName("카테고리에 해당하는 상점 아이템이 없으면 빈 목록을 반환한다")
    void getShopItemsByCategoryReturnsEmptyList() {
        // given
        given(itemRepository.findAllByCategoryAndAvailableForSaleTrue("TOP")).willReturn(List.of());

        // when
        List<ShopItemResponse> responses = shopItemReadService.getShopItems("TOP");

        // then
        assertThat(responses).isEmpty();
        then(itemRepository).should().findAllByCategoryAndAvailableForSaleTrue("TOP");
    }

    @Test
    @DisplayName("유효하지 않은 카테고리로 조회하면 실패한다")
    void getShopItemsByCategoryRejectsInvalidCategory() {
        // when & then
        assertThatThrownBy(() -> shopItemReadService.getShopItems("UNKNOWN"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        then(itemRepository).should(never()).findAllByAvailableForSaleTrue();
        then(itemRepository).should(never()).findAllByCategoryAndAvailableForSaleTrue(Mockito.anyString());
    }

    @Test
    @DisplayName("소문자 카테고리로 조회하면 실패한다")
    void getShopItemsByCategoryRejectsLowercaseCategory() {
        // when & then
        assertThatThrownBy(() -> shopItemReadService.getShopItems("hat"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        then(itemRepository).should(never()).findAllByAvailableForSaleTrue();
        then(itemRepository).should(never()).findAllByCategoryAndAvailableForSaleTrue(Mockito.anyString());
    }
}
