package com.wecandoit.ranking.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("랭킹 캐릭터 조회 서비스")
@ExtendWith(MockitoExtension.class)
class RankingCharacterReadServiceTest {

    @Mock
    private MemberEquippedItemRepository memberEquippedItemRepository;
    @Mock
    private MemberItemRepository memberItemRepository;
    @Mock
    private ItemRepository itemRepository;
    @InjectMocks
    private RankingCharacterReadService rankingCharacterReadService;

    @Test
    @DisplayName("랭킹 페이지 회원들의 장착 아이템을 일괄 조회한다")
    void getEquippedItemsByMemberIdsReturnsItemsGroupedByMemberId() {
        // given
        MemberEquippedItem firstMemberHat =
                MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        MemberEquippedItem secondMemberTop =
                MemberEquippedItem.create(2L, 20L, ItemCategory.TOP);
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 2L, 200L);
        Item hatItem = item(
                100L,
                "빨간 모자",
                "HAT",
                "https://example.com/hat.png"
        );
        Item topItem = item(
                200L,
                "파란 상의",
                "TOP",
                "https://example.com/top.png"
        );
        given(memberEquippedItemRepository.findAllByMemberIdIn(List.of(1L, 2L, 3L)))
                .willReturn(List.of(firstMemberHat, secondMemberTop));
        given(memberItemRepository.findAllById(List.of(10L, 20L)))
                .willReturn(List.of(hat, top));
        given(itemRepository.findAllById(List.of(100L, 200L)))
                .willReturn(List.of(hatItem, topItem));

        // when
        Map<Long, List<EquippedItemResponse>> responses =
                rankingCharacterReadService.getEquippedItemsByMemberIds(List.of(1L, 2L, 3L));

        // then
        assertThat(responses.get(1L)).singleElement()
                .extracting(
                        EquippedItemResponse::memberItemId,
                        EquippedItemResponse::itemId,
                        EquippedItemResponse::imageUrl
                )
                .containsExactly(10L, 100L, "https://example.com/hat.png");
        assertThat(responses.get(2L)).singleElement()
                .extracting(EquippedItemResponse::memberItemId)
                .isEqualTo(20L);
        assertThat(responses).doesNotContainKey(3L);
        then(memberEquippedItemRepository).should()
                .findAllByMemberIdIn(List.of(1L, 2L, 3L));
        then(memberItemRepository).should().findAllById(List.of(10L, 20L));
        then(itemRepository).should().findAllById(List.of(100L, 200L));
    }

    @Test
    @DisplayName("장착 아이템이 없으면 상세 조회 없이 빈 결과를 반환한다")
    void getEquippedItemsByMemberIdsReturnsEmptyMapWithoutEquippedItems() {
        // given
        given(memberEquippedItemRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(List.of());

        // when
        Map<Long, List<EquippedItemResponse>> responses =
                rankingCharacterReadService.getEquippedItemsByMemberIds(List.of(1L));

        // then
        assertThat(responses).isEmpty();
        then(memberItemRepository).should(never()).findAllById(Mockito.anyIterable());
        then(itemRepository).should(never()).findAllById(Mockito.anyIterable());
    }
}
