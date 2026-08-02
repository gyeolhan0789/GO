import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { ItemCategory } from '../../features/member/api/memberApi';
import { AppText } from '../../shared/components/AppText/AppText';
import { ITEM_CATEGORIES } from '../../features/member/constants/itemCategories';
import { useMyCashQuery } from '../../features/member/hooks/useMyCashQuery';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import { useMyItemsQuery } from '../../features/member/hooks/useMyItemsQuery';
import type {
  CharacterItem,
  CharacterLayer,
} from '../../features/member/model/character';
import type { EquippedByCategory } from '../../features/member/model/equippedItems';
import {
  hasEquippedItem,
  isEquipped,
  selectLayerItems,
  toEquippedByCategory,
} from '../../features/member/model/equippedItems';
import type { ShopItemResponse } from '../../features/shop/api/shopApi';
import { usePurchaseItemMutation } from '../../features/shop/hooks/usePurchaseItemMutation';
import { useShopItemsQuery } from '../../features/shop/hooks/useShopItemsQuery';
import type { ShopItem } from '../../features/shop/model/shopItem';
import { toShopItems } from '../../features/shop/model/shopItem';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { Fab } from '../../shared/components/Fab/Fab';
import { Header } from '../../shared/components/Header/Header';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import {
  SCROLL_THROTTLE_MS,
  useScrollTopButton,
} from '../../shared/hooks/useScrollTopButton';
import { CategoryTabs } from '../../features/member/components/CategoryTabs';
import { CharacterStage } from './components/CharacterStage';
import { EquipResetButton } from './components/EquipResetButton';
import { FilterSelect } from './components/FilterSelect';
import { PointBadge } from '../../features/member/components/PointBadge';
import { PurchaseConfirmModal } from './components/PurchaseConfirmModal';
import { ShopItemCard } from './components/ShopItemCard';
import { withObjectParticle } from './format';
import { equipItem, selectVisibleItems } from './model';
import type { ShopFilter } from './types';

const NOT_ENOUGH_POINTS_MESSAGE = '포인트가 부족해요.';

const SHOP_COLUMN_COUNT = 3;

// 구매 토스트 한 줄 높이(세로 여백 + 글줄). 맨 위로 버튼을 그만큼 띄운다.
const TOAST_CLEARANCE = spacing.sm * 2 + lineHeights[14];

const EMPTY_SHOP_ITEMS: ShopItemResponse[] = [];
const EMPTY_OWNED_ITEMS: CharacterItem[] = [];

export function ShopScreen() {
  const cash = useMyCashQuery();
  const character = useMyCharacterQuery();
  const myItems = useMyItemsQuery();
  const shopItems = useShopItemsQuery();
  const purchase = usePurchaseItemMutation();

  const [category, setCategory] = useState<ItemCategory>(
    ITEM_CATEGORIES[0].value,
  );
  const [filter, setFilter] = useState<ShopFilter>('all');
  // null이면 아직 입어보지 않았다는 뜻. 조회가 늦게 끝나도 골라둔 옷을 덮어쓰지
  // 않는다. 여기서 입는 건 미리보기일 뿐이고, 저장은 꾸미기 화면이 맡는다.
  const [tryOn, setTryOn] = useState<EquippedByCategory<CharacterLayer> | null>(
    null,
  );
  const [pendingPurchase, setPendingPurchase] = useState<ShopItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { listRef, isScrolledDown, handleScroll, scrollToTop } =
    useScrollTopButton<ShopItem | null>();

  const points = cash.data?.cash ?? 0;

  const items = useMemo(
    () =>
      toShopItems(
        shopItems.data ?? EMPTY_SHOP_ITEMS,
        myItems.data ?? EMPTY_OWNED_ITEMS,
      ),
    [shopItems.data, myItems.data],
  );

  const savedEquipped = useMemo(
    () =>
      toEquippedByCategory<CharacterLayer>(
        character.data?.equippedItems ?? EMPTY_OWNED_ITEMS,
      ),
    [character.data?.equippedItems],
  );
  const equipped = tryOn ?? savedEquipped;

  const visibleItems = useMemo(
    () => selectVisibleItems(items, category, filter),
    [items, category, filter],
  );
  // 마지막 줄이 덜 찼을 때 남은 카드가 빈 자리를 먹고 늘어나지 않도록 빈 칸을 채운다.
  const gridItems = useMemo<(ShopItem | null)[]>(() => {
    const remainder = visibleItems.length % SHOP_COLUMN_COUNT;
    if (remainder === 0) {
      return visibleItems;
    }

    return [
      ...visibleItems,
      ...(Array(SHOP_COLUMN_COUNT - remainder).fill(null) as null[]),
    ];
  }, [visibleItems]);
  const categoryLabel =
    ITEM_CATEGORIES.find(option => option.value === category)?.label ?? '';

  const errorMessage = shopItems.isError
    ? resolveApiErrorMessage(shopItems.error)
    : character.isError
    ? resolveApiErrorMessage(character.error)
    : myItems.isError
    ? resolveApiErrorMessage(myItems.error)
    : cash.isError
    ? resolveApiErrorMessage(cash.error)
    : null;

  // 구매하지 않은 아이템도 미리 입어볼 수 있다. 구매는 가격 버튼에서만 일어난다.
  const handleTryOn = (item: ShopItem) => {
    setTryOn(current => equipItem(current ?? savedEquipped, item));
  };

  const handlePurchasePress = (item: ShopItem) => {
    if (item.owned) {
      return;
    }

    if (points < item.price) {
      setToastMessage(NOT_ENOUGH_POINTS_MESSAGE);
      return;
    }

    setPendingPurchase(item);
  };

  const handleConfirmPurchase = () => {
    const item = pendingPurchase;
    if (!item) {
      return;
    }

    purchase.mutate(item, {
      // 산 옷은 바로 입혀 보여준다(저장은 아니다). 보유 여부·포인트는 mutation이
      // 캐시를 갱신한다.
      onSuccess: () => {
        handleTryOn(item);
        setToastMessage(`${withObjectParticle(item.name)} 구매했어요`);
        setPendingPurchase(null);
      },
      onError: error => {
        setToastMessage(resolveApiErrorMessage(error));
        setPendingPurchase(null);
      },
    });
  };

  const hideToast = useCallback(() => setToastMessage(null), []);

  return (
    <Screen>
      <FlatList
        ref={listRef}
        onScroll={handleScroll}
        scrollEventThrottle={SCROLL_THROTTLE_MS}
        data={gridItems}
        keyExtractor={(item, index) =>
          item ? String(item.itemId) : `placeholder-${index}`
        }
        numColumns={SHOP_COLUMN_COUNT}
        // 착용 상태(equipped)는 data 밖에 있어서, 이게 없으면 PureComponent인
        // FlatList가 셀을 다시 그리지 않아 버튼 상태가 옛 값에 멈춘다.
        extraData={equipped}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Header
              title="상점"
              subtitle="아이템으로 캐릭터를 꾸며보세요"
              trailing={<PointBadge points={points} />}
            />
            <CharacterStage
              baseImage={character.data?.baseImage ?? null}
              items={selectLayerItems(equipped)}
            />
            <EquipResetButton
              onPress={() => setTryOn({})}
              disabled={!hasEquippedItem(equipped)}
            />
            <CategoryTabs value={category} onChange={setCategory} />
            {errorMessage ? (
              <AppText style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </AppText>
            ) : null}
            <View style={styles.countRow}>
              <AppText style={styles.countLabel}>
                {`${categoryLabel} ${visibleItems.length}개`}
              </AppText>
              <FilterSelect value={filter} onChange={setFilter} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <AppText style={styles.emptyText}>
            {shopItems.isPending
              ? '상점 아이템을 불러오는 중이에요.'
              : filter === 'owned'
              ? '아직 구매한 아이템이 없어요.'
              : filter === 'notOwned'
              ? '구매할 수 있는 아이템을 모두 모았어요!'
              : '이 카테고리에는 판매 중인 아이템이 없어요.'}
          </AppText>
        }
        renderItem={({ item }) =>
          item ? (
            <ShopItemCard
              item={item}
              isEquipped={isEquipped(equipped, item)}
              onTryOn={() => handleTryOn(item)}
              onPurchase={() => handlePurchasePress(item)}
            />
          ) : (
            <View style={styles.gridPlaceholder} />
          )
        }
        style={styles.list}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {isScrolledDown ? (
        <View style={styles.scrollToTop}>
          <Fab
            icon="arrow-up"
            onPress={scrollToTop}
            accessibilityLabel="맨 위로"
          />
        </View>
      ) : null}

      <PurchaseConfirmModal
        item={pendingPurchase}
        points={points}
        isPurchasing={purchase.isPending}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setPendingPurchase(null)}
      />

      <Toast message={toastMessage} onHide={hideToast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listHeader: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  countLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  errorText: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.danger,
  },
  column: {
    gap: spacing.md,
  },
  gridPlaceholder: {
    flex: 1,
  },
  emptyText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    // 탭 바에 마지막 줄이 가리지 않도록 스크롤 끝에 여유를 둔다.
    paddingBottom: spacing.lg * 2,
  },
  scrollToTop: {
    position: 'absolute',
    right: spacing.lg,
    // 토스트가 같은 바닥선에 화면 폭으로 뜬다. 그 위로 올려 가려지지 않게 한다.
    bottom: spacing.lg + TOAST_CLEARANCE,
  },
});
