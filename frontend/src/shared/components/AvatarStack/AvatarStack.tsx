import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '../AppText/AppText';
import { colors } from '../../constants/colors';
import { fontFamily, lineHeights } from '../../constants/typography';

type AvatarStackMember = {
  id: string;
  imageUri?: string;
  /** 원 안에 그릴 내용물(예: 캐릭터 흉상). imageUri보다 우선한다. */
  avatar?: ReactNode;
};

type GridCell = AvatarStackMember | 'overflow';

type AvatarStackProps = {
  members: AvatarStackMember[];
  size?: number;
};

const DEFAULT_SIZE = 36;
// Above 2 members the stack switches to a 2x2 grid; beyond that, the last
// cell becomes a "+N" overflow badge instead of a 4th avatar.
const GRID_MAX = 4;

export function AvatarStack({ members, size = DEFAULT_SIZE }: AvatarStackProps) {
  if (members.length <= 2) {
    return <RowLayout members={members} size={size} />;
  }
  return <GridLayout members={members} size={size} />;
}

function RowLayout({
  members,
  size,
}: {
  members: AvatarStackMember[];
  size: number;
}) {
  const overlap = -(size * 0.35);

  return (
    <View style={styles.row}>
      {members.map((member, index) => (
        <AvatarCircle
          key={member.id}
          member={member}
          size={size}
          style={index === 0 ? undefined : { marginLeft: overlap }}
        />
      ))}
    </View>
  );
}

function GridLayout({
  members,
  size,
}: {
  members: AvatarStackMember[];
  size: number;
}) {
  const hasOverflow = members.length > GRID_MAX;
  const avatarCount = hasOverflow ? GRID_MAX - 1 : Math.min(members.length, GRID_MAX);
  const visible = members.slice(0, avatarCount);
  const overflowCount = members.length - avatarCount;
  const overlap = -(size * 0.35);

  // Exactly 3 members (nothing hidden) forms a centered triangle instead of
  // a lopsided 2x2; any overflow badge fills the 4th cell back into a grid.
  if (!hasOverflow && visible.length === 3) {
    const [first, second, third] = visible;

    return (
      <View>
        <View style={styles.row}>
          <AvatarCircle member={first} size={size} />
          <AvatarCircle member={second} size={size} style={{ marginLeft: overlap }} />
        </View>
        <View style={[styles.row, styles.centerRow, { marginTop: overlap }]}>
          <AvatarCircle member={third} size={size} />
        </View>
      </View>
    );
  }

  const cells: GridCell[] = [...visible];
  if (hasOverflow) {
    cells.push('overflow');
  }

  const firstRow = cells.slice(0, 2);
  const secondRow = cells.slice(2, 4);

  return (
    <View>
      <GridRow cells={firstRow} size={size} overlap={overlap} overflowCount={overflowCount} />
      {secondRow.length > 0 ? (
        <GridRow
          cells={secondRow}
          size={size}
          overlap={overlap}
          overflowCount={overflowCount}
          style={{ marginTop: overlap }}
        />
      ) : null}
    </View>
  );
}

function GridRow({
  cells,
  size,
  overlap,
  overflowCount,
  style,
}: {
  cells: GridCell[];
  size: number;
  overlap: number;
  overflowCount: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      {cells.map((cell, index) =>
        cell === 'overflow' ? (
          <OverflowBadge
            key="overflow"
            size={size}
            count={overflowCount}
            style={index === 0 ? undefined : { marginLeft: overlap }}
          />
        ) : (
          <AvatarCircle
            key={cell.id}
            member={cell}
            size={size}
            style={index === 0 ? undefined : { marginLeft: overlap }}
          />
        ),
      )}
    </View>
  );
}

function AvatarCircle({
  member,
  size,
  style,
}: {
  member: AvatarStackMember;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {member.avatar ??
        (member.imageUri ? (
          <Image source={{ uri: member.imageUri }} style={styles.image} />
        ) : null)}
    </View>
  );
}

function OverflowBadge({
  size,
  count,
  style,
}: {
  size: number;
  count: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.avatar,
        styles.overflowBadge,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <AppText style={styles.overflowText}>+{count}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerRow: {
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: colors.successBg,
    borderWidth: 2,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overflowBadge: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.surface,
  },
});
