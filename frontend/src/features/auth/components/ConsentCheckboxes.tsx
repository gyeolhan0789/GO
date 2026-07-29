import { StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '../../../shared/components/Checkbox/Checkbox';

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

const LABEL_COLOR = '#374151';
const LINK_COLOR = '#2C6A47';
const ERROR_COLOR = '#DC2626';

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
        <Text style={styles.label}>
          <Text
            style={styles.link}
            onPress={onPressTerms}
            accessibilityRole="link"
          >
            서비스 이용약관
          </Text>
          {' 및 '}
          <Text
            style={styles.link}
            onPress={onPressPrivacy}
            accessibilityRole="link"
          >
            개인정보처리방침
          </Text>
          에 동의합니다.
        </Text>
      </Checkbox>
      {termsError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {termsError}
        </Text>
      ) : null}

      <Checkbox
        checked={agreeAge}
        onToggle={onToggleAge}
        accessibilityLabel="만 14세 이상입니다."
      >
        <Text style={styles.label}>만 14세 이상입니다.</Text>
      </Checkbox>
      {ageError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {ageError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: LABEL_COLOR,
  },
  link: {
    fontWeight: '700',
    color: LINK_COLOR,
  },
  error: {
    marginTop: 2,
    marginBottom: 4,
    fontSize: 13,
    color: ERROR_COLOR,
  },
});
