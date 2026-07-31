import { StyleSheet, View } from 'react-native';
import Ionicons, {
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';

import type { PermissionResult } from '../../../shared/lib/permissions';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type PermissionCardProps = {
  icon: IoniconsIconName;
  title: string;
  description: string;
  status?: PermissionResult;
};

const GREEN = colors.primaryDark;
const GRAY = colors.muted;
const RED = colors.danger;

export function PermissionCard({
  icon,
  title,
  description,
  status,
}: PermissionCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={24} color={GREEN} />
      </View>
      <View style={styles.textBox}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.description}>{description}</AppText>
      </View>
      <View style={styles.statusBox}>
        {status ? <StatusMark status={status} /> : null}
      </View>
    </View>
  );
}

function StatusMark({ status }: { status: PermissionResult }) {
  if (status === 'granted') {
    return <Ionicons name="checkmark-circle" size={22} color={GREEN} />;
  }
  if (status === 'blocked') {
    return <Ionicons name="close-circle" size={22} color={RED} />;
  }
  return <Ionicons name="ellipse-outline" size={22} color={GRAY} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 92,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textBox: {
    flex: 1,
  },
  statusBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  title: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  description: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedStrong,
    marginTop: 2,
  },
});
