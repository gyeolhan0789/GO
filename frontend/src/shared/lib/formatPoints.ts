/** 1000 -> "1,000P". Hermes의 Intl 지원 편차를 피하려고 직접 자릿수를 끊는다. */
export function formatPoints(value: number): string {
  return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}P`;
}
