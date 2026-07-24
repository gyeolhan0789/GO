import { StyleSheet, Text, View } from 'react-native';
import Ionicons, {
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';

import type { PermissionResult } from '../../../shared/lib/permissions';

type PermissionCardProps = {
  icon: IoniconsIconName;
  title: string;
  description: string;
  status?: PermissionResult;
};

const GREEN = '#2C6A47';
const GRAY = '#9CA3AF';
const RED = '#DC2626';

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
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
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
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
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
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#111827',
  },
  description: {
    fontFamily: 'NotoSansKR-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 2,
  },
});
