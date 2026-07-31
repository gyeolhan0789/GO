import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { Checkbox } from '../../../shared/components/Checkbox/Checkbox';
import { colors } from '../../../shared/constants/colors';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type ConsentCheckboxesProps = {
  agreeTerms: boolean;
  agreeAge: boolean;
  onToggleTerms: () => void;
  onToggleAge: () => void;
  onPressTerms: () => void;
  onPressPrivacy: () => void;
  termsError?: string;
  ageError?: string;
};

const LABEL_COLOR = colors.inkSoft;
const LINK_COLOR = colors.primaryDark;
const ERROR_COLOR = colors.danger;

export function ConsentCheckboxes({
  agreeTerms,
  agreeAge,
  onToggleTerms,
  onToggleAge,
  onPressTerms,
  onPressPrivacy,
  termsError,
  ageError,
}: ConsentCheckboxesProps) {
  return (
    <View>
      <Checkbox
        checked={agreeTerms}
        onToggle={onToggleTerms}
        accessibilityLabel="서비스 이용약관 및 개인정보처리방침에 동의합니다."
      >
        <AppText style={styles.label}>
          <AppText
            style={styles.link}
            onPress={onPressTerms}
            accessibilityRole="link"
          >
            서비스 이용약관
          </AppText>
          {' 및 '}
          <AppText
            style={styles.link}
            onPress={onPressPrivacy}
            accessibilityRole="link"
          >
            개인정보처리방침
          </AppText>
          에 동의합니다.
        </AppText>
      </Checkbox>
      {termsError ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite">
          {termsError}
        </AppText>
      ) : null}

      <Checkbox
        checked={agreeAge}
        onToggle={onToggleAge}
        accessibilityLabel="만 14세 이상입니다."
      >
        <AppText style={styles.label}>만 14세 이상입니다.</AppText>
      </Checkbox>
      {ageError ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite">
          {ageError}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: LABEL_COLOR,
  },
  link: {
    fontFamily: bodyFont.bold,
    color: LINK_COLOR,
  },
  error: {
    marginTop: 2,
    marginBottom: 4,
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: ERROR_COLOR,
  },
});
