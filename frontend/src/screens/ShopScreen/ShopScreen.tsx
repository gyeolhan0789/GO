import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { ItemCategory } from '../../features/member/api/memberApi';
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
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import shopIconXml from './assets/ShopIcon';
import { CategoryTabs } from './components/CategoryTabs';
import { CharacterStage } from './components/CharacterStage';
import { EquipResetButton } from './components/EquipResetButton';
import { FilterSelect } from './components/FilterSelect';
import { PointBadge } from './components/PointBadge';
import { PurchaseConfirmModal } from './components/PurchaseConfirmModal';
import { ShopItemCard } from './components/ShopItemCard';
import { withObjectParticle } from './format';
import { equipItem, selectVisibleItems } from './model';
import type { ShopFilter } from './types';

const SHOP_ICON_SIZE = 28;
const NOT_ENOUGH_POINTS_MESSAGE = '포인트가 부족해요.';

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
  // 홀수 개일 때 마지막 카드가 두 칸 폭으로 늘어나지 않도록 빈 칸을 채운다.
  const gridItems = useMemo<(ShopItem | null)[]>(
    () =>
      visibleItems.length % 2 === 1 ? [...visibleItems, null] : visibleItems,
    [visibleItems],
  );
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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <SvgXml
              xml={shopIconXml}
              width={SHOP_ICON_SIZE}
              height={SHOP_ICON_SIZE}
            />
            <Text style={styles.pageTitle}>상점</Text>
          </View>
          <Text style={styles.pageSubtitle}>
            아이템으로 캐릭터를 꾸며보세요
          </Text>
        </View>
        <PointBadge points={points} />
      </View>

      <FlatList
        data={gridItems}
        keyExtractor={(item, index) =>
          item ? String(item.itemId) : `placeholder-${index}`
        }
        numColumns={2}
        // 착용 상태(equipped)는 data 밖에 있어서, 이게 없으면 PureComponent인
        // FlatList가 셀을 다시 그리지 않아 버튼 상태가 옛 값에 멈춘다.
        extraData={equipped}
        ListHeaderComponent={
          <View style={styles.listHeader}>
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
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>
                {`${categoryLabel} ${visibleItems.length}개`}
              </Text>
              <FilterSelect value={filter} onChange={setFilter} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {shopItems.isPending
              ? '상점 아이템을 불러오는 중이에요.'
              : filter === 'owned'
              ? '아직 구매한 아이템이 없어요.'
              : filter === 'notOwned'
              ? '구매할 수 있는 아이템을 모두 모았어요!'
              : '이 카테고리에는 판매 중인 아이템이 없어요.'}
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: {
    flexShrink: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontFamily: 'BMDOHYEON',
    fontSize: 24,
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: 'NotoSansKR-Medium',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.5,
  },
  list: {
    flex: 1,
  },
  listHeader: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  countLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 16,
    color: colors.ink,
  },
  errorText: {
    fontFamily: 'NotoSansKR-Medium',
    fontSize: 12,
    color: colors.danger,
  },
  column: {
    gap: spacing.md,
  },
  gridPlaceholder: {
    flex: 1,
  },
  emptyText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
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
});
