import { useCallback, useState } from 'react';
import type {
  ImageSourcePropType,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import type {
  BingoBoardCell,
  BingoBoardSize,
} from '../../../features/bingo/components/BingoBoard/BingoBoard';
import type { CharacterLayer } from '../../../features/member/model/character';
import { spacing } from '../../../shared/constants/spacing';
import { BingoPreviewPage } from './BingoPreviewPage';
import { HomeSummaryPage } from './HomeSummaryPage';
import { SquarePagination } from './SquarePagination';

type HomeCarouselProps = {
  steps: number;
  characterName: string;
  characterBaseImage: ImageSourcePropType | null;
  characterFallbackImage?: ImageSourcePropType | null;
  characterItems: CharacterLayer[];
  distanceKm: number;
  calories: number;
  bingoSize: BingoBoardSize;
  bingoCells: BingoBoardCell[];
  bingoHint?: string;
  onBingoCellPress?: (cell: BingoBoardCell) => void;
  style?: StyleProp<ViewStyle>;
  isWalking?: boolean;
  walkElapsedLabel?: string;
  onPressWalkBadge?: () => void;
};

const PAGE_COUNT = 2;

export function HomeCarousel({
  steps,
  characterName,
  characterBaseImage,
  characterFallbackImage,
  characterItems,
  distanceKm,
  calories,
  bingoSize,
  bingoCells,
  bingoHint,
  onBingoCellPress,
  style,
  isWalking,
  walkElapsedLabel,
  onPressWalkBadge,
}: HomeCarouselProps) {
  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // 이 컨테이너 자체의 렌더 너비를 페이지 폭으로 쓴다. HomeHeader/Button과
  // 같은 padding 안에 있으므로 화면 전체 너비를 쓸 필요가 없다.
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setPageWidth(event.nativeEvent.layout.width);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth === 0) {
        return;
      }
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.x / pageWidth,
      );
      setActiveIndex(nextIndex);
    },
    [pageWidth],
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.scrollWrapper} onLayout={handleLayout}>
        {pageWidth > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            <View style={{ width: pageWidth }}>
              <HomeSummaryPage
                steps={steps}
                characterName={characterName}
                characterBaseImage={characterBaseImage}
                characterFallbackImage={characterFallbackImage}
                characterItems={characterItems}
                distanceKm={distanceKm}
                calories={calories}
                isWalking={isWalking}
                walkElapsedLabel={walkElapsedLabel}
                onPressWalkBadge={onPressWalkBadge}
              />
            </View>
            <View style={{ width: pageWidth }}>
              <BingoPreviewPage
                size={bingoSize}
                cells={bingoCells}
                hint={bingoHint}
                onCellPress={onBingoCellPress}
              />
            </View>
          </ScrollView>
        ) : null}
      </View>
      <SquarePagination count={PAGE_COUNT} activeIndex={activeIndex} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  scrollWrapper: {
    flex: 1,
  },
});
