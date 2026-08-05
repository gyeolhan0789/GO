/**
 * 'yyyy-MM-dd' 로컬 날짜 문자열 변환. 서버 응답·걸음 원장·기록 화면이 모두 이 형식을 쓴다.
 *
 * `features/history/model/period`가 여기서 다시 내보낸다 — 걸음 원장(shared)도 같은
 * 변환이 필요한데 shared는 features를 참조할 수 없어서 여기로 올렸다.
 */

/** new Date(iso)는 UTC로 파싱돼 하루가 밀린다. 로컬 자정으로 만든다. */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** toISOString은 UTC로 바꿔버려서 직접 조립한다. */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
