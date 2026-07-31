import { Rect, Svg } from 'react-native-svg';

import type { PixelSpriteData } from '../assets/sprites';

type PixelSpriteProps = {
  sprite: PixelSpriteData;
  /** 스프라이트 가로 크기(dp). 세로는 픽셀 격자 비율대로 따라간다. */
  size: number;
};

export function PixelSprite({ sprite, size }: PixelSpriteProps) {
  const columns = sprite.rows[0]?.length ?? 0;
  const rowCount = sprite.rows.length;

  if (columns === 0 || rowCount === 0) {
    return null;
  }

  return (
    <Svg
      width={size}
      height={(size * rowCount) / columns}
      viewBox={`0 0 ${columns} ${rowCount}`}
    >
      {sprite.rows.map((row, y) =>
        Array.from(row).map((key, x) => {
          const fill = sprite.palette[key];
          if (!fill) {
            return null;
          }
          return (
            <Rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
            />
          );
        }),
      )}
    </Svg>
  );
}
