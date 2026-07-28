/** 1000 -> "1,000P". Hermes의 Intl 지원 편차를 피하려고 직접 자릿수를 끊는다. */
export function formatPoints(value: number): string {
  return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}P`;
}

const HANGUL_SYLLABLE_FIRST = 0xac00;
const HANGUL_SYLLABLE_LAST = 0xd7a3;
const JONGSEONG_COUNT = 28;

/** 받침 유무에 맞춰 목적격 조사를 붙인다. ('리본삔을', '크림 니트를') */
export function withObjectParticle(word: string): string {
  const lastCode = word.charCodeAt(word.length - 1);
  const isHangulSyllable =
    lastCode >= HANGUL_SYLLABLE_FIRST && lastCode <= HANGUL_SYLLABLE_LAST;

  if (!isHangulSyllable) {
    return `${word}를`;
  }

  const hasFinalConsonant =
    (lastCode - HANGUL_SYLLABLE_FIRST) % JONGSEONG_COUNT !== 0;
  return `${word}${hasFinalConsonant ? '을' : '를'}`;
}
