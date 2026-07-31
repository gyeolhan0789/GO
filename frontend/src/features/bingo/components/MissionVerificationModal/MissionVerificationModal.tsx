import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { VerificationResult } from '../../api/bingoApi';
import { AppText } from '../../../../shared/components/AppText/AppText';
import { BottomSheet } from '../../../../shared/components/BottomSheet/BottomSheet';
import { controlHeight } from '../../../../shared/constants/sizing';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../../shared/constants/typography';

type MissionVerificationModalProps = {
  visible: boolean;
  onClose: () => void;
  /** 미리보기 단계에서 보여줄, 방금 찍은 사진. */
  photoUri: string | null;
  missionTitle: string;
  isSubmitting: boolean;
  /** 제출 전(null) / 승인 / 반려. */
  result: VerificationResult | null;
  onRetake: () => void;
  onSubmit: () => void;
  /** 승인 화면의 확인 버튼. */
  onConfirm: () => void;
};

/**
 * 사진 촬영 → 미리보기 → 분석중 → 승인/반려까지, 인증 한 건의 전체 흐름을
 * 담당하는 모달. 미션 설명(제목/타입/포인트/디테일)은 화면 쪽 인라인 카드에
 * 그대로 남고, 이 모달은 "촬영한 사진으로 인증하기" 이후만 다룬다.
 */
export function MissionVerificationModal({
  visible,
  onClose,
  photoUri,
  missionTitle,
  isSubmitting,
  result,
  onRetake,
  onSubmit,
  onConfirm,
}: MissionVerificationModalProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={missionTitle}>
      {isSubmitting ? (
        <View style={styles.pendingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.pendingText}>AI가 사진을 분석하고 있어요...</AppText>
        </View>
      ) : result?.status === 'APPROVED' ? (
        <View style={styles.resultWrap}>
          <View style={styles.stampWrapper}>
            <View style={styles.stampShadow} />
            <View style={styles.stamp}>
              <Ionicons name="ribbon-outline" size={36} color={colors.ink} />
            </View>
          </View>
          <AppText style={styles.resultTitle}>미션 성공!</AppText>
          <AppText style={styles.resultSubtitle}>
            '{missionTitle}' 미션을 완료했어요{'\n'}빙고 한 칸을 채웠어요!
          </AppText>
          <View style={styles.rewardBadge}>
            <View style={styles.rewardDot} />
            <AppText style={styles.rewardBadgeText}>
              +{result.rewardCash} 포인트 획득
            </AppText>
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel="확인"
          >
            <AppText style={styles.primaryButtonText}>확인</AppText>
          </Pressable>
        </View>
      ) : result?.status === 'REJECTED' ? (
        <View style={styles.resultWrap}>
          <Ionicons name="close-circle" size={56} color={colors.danger} />
          <AppText style={[styles.resultTitle, styles.resultTitleFailure]}>
            미션 실패
          </AppText>
          <AppText style={styles.resultSubtitle}>{result.rejectionReason}</AppText>
          <Pressable
            style={styles.primaryButtonRow}
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel="다시 촬영하기"
          >
            <Ionicons name="camera" size={18} color={colors.surface} />
            <AppText style={styles.primaryButtonText}>다시 촬영하기</AppText>
          </Pressable>
        </View>
      ) : (
        <>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : null}
          <View style={styles.photoActionsRow}>
            <Pressable
              style={styles.retakeButton}
              onPress={onRetake}
              accessibilityRole="button"
              accessibilityLabel="사진 다시 찍기"
            >
              <AppText style={styles.retakeButtonText}>다시 찍기</AppText>
            </Pressable>
            <Pressable
              style={styles.submitButton}
              onPress={onSubmit}
              accessibilityRole="button"
              accessibilityLabel="미션 제출하기"
            >
              <AppText style={styles.primaryButtonText}>제출하기</AppText>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pendingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  pendingText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.7,
  },
  resultWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  stampWrapper: {
    width: 84,
    height: 84,
    marginBottom: spacing.lg,
  },
  stampShadow: {
    position: 'absolute',
    top: 6,
    left: 3,
    width: '100%',
    height: '100%',
    backgroundColor: colors.ink,
    transform: [{ rotate: '-8deg' }],
  },
  stamp: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.highlightBg,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  resultTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: lineHeights[20],
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  resultTitleFailure: {
    color: colors.danger,
    marginTop: spacing.md,
  },
  resultSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  rewardDot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.highlightBg,
  },
  rewardBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.neutralBg,
    marginBottom: spacing.lg,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  retakeButton: {
    flex: 1,
    height: controlHeight.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  submitButton: {
    flex: 1,
    height: controlHeight.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    height: controlHeight.lg,
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonRow: {
    height: controlHeight.lg,
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.surface,
  },
});
