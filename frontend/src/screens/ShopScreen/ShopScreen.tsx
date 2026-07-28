import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Screen } from '../../shared/components/Screen/Screen';
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
import { SHOP_CATEGORIES } from './constants';
import { MOCK_CHARACTER, MOCK_SHOP_ITEMS } from './mocks';
import {
  equipItem,
  hasEquippedItem,
  isEquipped,
  markItemOwned,
  purchaseItem,
  resetEquipped,
  selectVisibleItems,
} from './model';
import type { ShopCategory, ShopFilter, ShopItem } from './types';

const SHOP_ICON_SIZE = 28;

export function ShopScreen() {
  const [category, setCategory] = useState<ShopCategory>('top');
  const [filter, setFilter] = useState<ShopFilter>('all');
  // TODO: 캐릭터/아이템 API 연동 전까지는 목업 데이터를 로컬 상태로만 굴린다.
  const [items, setItems] = useState<ShopItem[]>(MOCK_SHOP_ITEMS);
  const [character, setCharacter] = useState(MOCK_CHARACTER);
  const [pendingPurchase, setPendingPurchase] = useState<ShopItem | null>(null);

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
    SHOP_CATEGORIES.find(option => option.value === category)?.label ?? '';

  // 구매하지 않은 아이템도 미리 입어볼 수 있다. 구매는 가격 버튼에서만 일어난다.
  const handleTryOn = (item: ShopItem) => {
    setCharacter(prev => equipItem(prev, item));
  };

  const handlePurchasePress = (item: ShopItem) => {
    if (item.owned) {
      return;
    }

    if (character.points < item.price) {
      Alert.alert('포인트가 부족해요', '산책으로 포인트를 더 모아보세요.');
      return;
    }

    setPendingPurchase(item);
  };

  const handleConfirmPurchase = () => {
    if (!pendingPurchase) {
      return;
    }

    setItems(prev => markItemOwned(prev, pendingPurchase.id));
    setCharacter(prev => purchaseItem(prev, pendingPurchase));
    setPendingPurchase(null);
  };

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
        <PointBadge points={character.points} />
      </View>

      <FlatList
        data={gridItems}
        keyExtractor={(item, index) => item?.id ?? `placeholder-${index}`}
        numColumns={2}
        // 착용 상태(character)는 data 밖에 있어서, 이게 없으면 PureComponent인
        // FlatList가 셀을 다시 그리지 않아 버튼 상태가 옛 값에 멈춘다.
        extraData={character}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <CharacterStage />
            <EquipResetButton
              onPress={() => setCharacter(resetEquipped)}
              disabled={!hasEquippedItem(character)}
            />
            <CategoryTabs value={category} onChange={setCategory} />
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
            {filter === 'owned'
              ? '아직 구매한 아이템이 없어요.'
              : '구매할 수 있는 아이템을 모두 모았어요!'}
          </Text>
        }
        renderItem={({ item }) =>
          item ? (
            <ShopItemCard
              item={item}
              isEquipped={isEquipped(character, item)}
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
        points={character.points}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setPendingPurchase(null)}
      />
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
