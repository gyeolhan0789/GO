import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { CharacterPreview } from '../../features/member/components/CharacterPreview';
import type { ItemCategory } from '../../features/member/api/memberApi';
import { ITEM_CATEGORIES } from '../../features/member/constants/itemCategories';
import type { CharacterItem } from '../../features/member/model/character';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import { useMyItemsQuery } from '../../features/member/hooks/useMyItemsQuery';
import { useSaveEquippedItemsMutation } from '../../features/member/hooks/useSaveEquippedItemsMutation';
import type { EquippedByCategory } from '../../features/member/model/equippedItems';
import {
  hasEquippedItem,
  isEquipped,
  isSameEquipped,
  selectLayerItems,
  toEquippedByCategory,
  toMemberItemIds,
  toggleEquipped,
} from '../../features/member/model/equippedItems';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { Button } from '../../shared/components/Button/Button';
import { Card } from '../../shared/components/Card/Card';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { textStyles } from '../../shared/constants/typography';
import { ItemCategoryTabs } from './components/ItemCategoryTabs';
import { OwnedItemCard } from './components/OwnedItemCard';
import { UndressButton } from './components/UndressButton';

const COLUMN_COUNT = 3;
const SAVED_MESSAGE = '캐릭터를 저장했어요';
const SCREEN_EDGES = ['bottom'] as const;

const EMPTY_ITEMS: CharacterItem[] = [];

export function CharacterCustomizeScreen() {
  const character = useMyCharacterQuery();
  const myItems = useMyItemsQuery();
  const saveEquipped = useSaveEquippedItemsMutation();

  const [category, setCategory] = useState<ItemCategory>(
    ITEM_CATEGORIES[0].value,
  );
  // null이면 아직 손대지 않았다는 뜻. 조회가 늦게 끝나도 고른 옷을 덮어쓰지 않는다.
  const [draft, setDraft] = useState<EquippedByCategory | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const savedEquipped = useMemo(
    () => toEquippedByCategory(character.data?.equippedItems ?? EMPTY_ITEMS),
    [character.data?.equippedItems],
  );
  const equipped = draft ?? savedEquipped;
  const isDirty = !isSameEquipped(equipped, savedEquipped);

  const items = myItems.data ?? EMPTY_ITEMS;
  const visibleItems = useMemo(
    () => items.filter(item => item.category === category),
    [items, category],
  );
  // 홀수 개일 때 마지막 카드가 남은 폭을 다 먹지 않도록 빈 칸을 채운다.
  const gridItems = useMemo<(CharacterItem | null)[]>(() => {
    const remainder = visibleItems.length % COLUMN_COUNT;
    if (remainder === 0) {
      return visibleItems;
    }
    return [
      ...visibleItems,
      ...Array<null>(COLUMN_COUNT - remainder).fill(null),
    ];
  }, [visibleItems]);

  const hideToast = useCallback(() => setToastMessage(null), []);

  function save() {
    saveEquipped.mutate(toMemberItemIds(equipped), {
      // draft는 그대로 둔다. 서버 캐시가 다시 채워지면 저장 버튼은 알아서 잠긴다.
      onSuccess: () => setToastMessage(SAVED_MESSAGE),
    });
  }

  const errorMessage = character.isError
    ? resolveApiErrorMessage(character.error)
    : myItems.isError
    ? resolveApiErrorMessage(myItems.error)
    : saveEquipped.isError
    ? resolveApiErrorMessage(saveEquipped.error)
    : null;

  return (
    <Screen edges={SCREEN_EDGES}>
      <FlatList
        data={gridItems}
        keyExtractor={(item, index) =>
          item ? String(item.memberItemId) : `placeholder-${index}`
        }
        numColumns={COLUMN_COUNT}
        // 착용 상태는 data 밖에 있어서, 이게 없으면 셀이 옛 상태에 멈춘다.
        extraData={equipped}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Card style={styles.characterCard}>
              <CharacterPreview
                baseImage={character.data?.baseImage ?? null}
                items={selectLayerItems(equipped)}
                style={styles.preview}
              />
            </Card>
            <UndressButton
              onPress={() => setDraft({})}
              disabled={!hasEquippedItem(equipped)}
            />
            <ItemCategoryTabs value={category} onChange={setCategory} />
            {errorMessage ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {myItems.isPending
              ? '보유 아이템을 불러오는 중이에요.'
              : '이 카테고리에 보유한 아이템이 없어요. 상점에서 먼저 구매해 주세요.'}
          </Text>
        }
        renderItem={({ item }) =>
          item ? (
            <OwnedItemCard
              item={item}
              isEquipped={isEquipped(equipped, item)}
              onToggle={() =>
                setDraft(current =>
                  toggleEquipped(current ?? savedEquipped, item),
                )
              }
            />
          ) : (
            <View style={styles.gridPlaceholder} />
          )
        }
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Button
          label={saveEquipped.isPending ? '저장 중...' : '저장하기'}
          onPress={save}
          disabled={!isDirty || saveEquipped.isPending}
        />
      </View>

      <Toast message={toastMessage} onHide={hideToast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  characterCard: {
    padding: spacing.sm,
  },
  preview: {
    borderRadius: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  column: {
    gap: spacing.md,
  },
  gridPlaceholder: {
    flex: 1,
  },
  emptyText: {
    ...textStyles.caption,
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.danger,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
});
