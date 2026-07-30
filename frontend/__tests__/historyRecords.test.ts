/**
 * @format
 */

import {
  formatThousands,
  formatWalkDateRange,
  formatWalkDateTime,
  formatWalkDayRange,
} from '../src/features/history/model/format';
import {
  maxValue,
  resolveChartCeiling,
} from '../src/features/history/model/chartScale';
import {
  buildHourlyChartData,
  buildStepChartData,
} from '../src/features/history/model/histories';
import {
  eachDateInRange,
  formatPeriodLabel,
  isCurrentPeriod,
  parseIsoDate,
  resolvePeriodRange,
  shiftPeriod,
  toIsoDate,
} from '../src/features/history/model/period';
import {
  buildHistoryResponse,
  buildHourlySteps,
} from '../src/features/history/model/samsungHealthHistory';
import {
  formatWalkResult,
  toWalkDetail,
  toWalkRecord,
} from '../src/features/history/model/gameResult';
import { resolveBarPercentage } from '../src/screens/RecordScreen/chartConfig';

describe('resolvePeriodRange', () => {
  test('주는 월요일에 시작해 일요일에 끝난다', () => {
    // 2026-07-20은 월요일.
    expect(resolvePeriodRange('WEEK', '2026-07-20')).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });
  });

  test('일요일은 그 주 월요일에 시작한 구간에 속한다', () => {
    // getDay()가 일요일을 0으로 주기 때문에 가장 틀리기 쉬운 경계.
    expect(resolvePeriodRange('WEEK', '2026-07-26')).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });
  });

  test('주가 달을 넘어가도 7일을 유지한다', () => {
    expect(resolvePeriodRange('WEEK', '2026-07-28')).toEqual({
      startDate: '2026-07-27',
      endDate: '2026-08-02',
    });
  });

  test('월은 1일부터 말일까지다', () => {
    expect(resolvePeriodRange('MONTH', '2026-02-15')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });

  test('윤년 2월은 29일까지다', () => {
    expect(resolvePeriodRange('MONTH', '2024-02-15')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
  });

  test('일은 그 하루가 시작이자 끝이다', () => {
    expect(resolvePeriodRange('DAY', '2026-07-28')).toEqual({
      startDate: '2026-07-28',
      endDate: '2026-07-28',
    });
  });
});

describe('shiftPeriod', () => {
  test('말일에서 달을 넘겨도 없는 날짜로 새지 않는다', () => {
    // 1월 31일에서 달만 +1 하면 2월 31일 = 3월 3일이 되어 2월을 건너뛴다.
    expect(shiftPeriod('MONTH', '2026-01-31', 1)).toBe('2026-02-01');
  });

  test('월을 거꾸로 옮긴다', () => {
    expect(shiftPeriod('MONTH', '2026-03-15', -1)).toBe('2026-02-01');
  });

  test('일은 해를 넘겨서도 하루씩 움직인다', () => {
    expect(shiftPeriod('DAY', '2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftPeriod('DAY', '2027-01-01', -1)).toBe('2026-12-31');
  });

  test('주는 7일씩 움직인다', () => {
    expect(shiftPeriod('WEEK', '2026-07-20', -1)).toBe('2026-07-13');
    expect(shiftPeriod('WEEK', '2026-07-20', 1)).toBe('2026-07-27');
  });
});

describe('isCurrentPeriod', () => {
  test('오늘이 든 구간이면 참이다', () => {
    expect(isCurrentPeriod('WEEK', '2026-07-28', '2026-07-28')).toBe(true);
  });

  test('지난 구간이면 거짓이다', () => {
    expect(isCurrentPeriod('WEEK', '2026-07-20', '2026-07-28')).toBe(false);
  });

  test('오늘이 구간의 마지막 날이어도 참이다', () => {
    expect(isCurrentPeriod('WEEK', '2026-07-20', '2026-07-26')).toBe(true);
  });
});

describe('날짜 변환', () => {
  test('로컬 자정으로 파싱해서 하루가 밀리지 않는다', () => {
    // new Date('2026-07-20')은 UTC 자정이라 KST에서 7/20 09:00이 되고,
    // 시간대가 UTC보다 뒤인 곳에서는 7/19로 밀린다.
    expect(toIsoDate(parseIsoDate('2026-07-20'))).toBe('2026-07-20');
  });

  test('한 자리 월/일에 0을 채운다', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('eachDateInRange', () => {
  test('주 구간의 7일을 빠짐없이 만든다', () => {
    const dates = eachDateInRange({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });

    expect(dates).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ]);
  });

  test('달을 넘는 구간도 이어서 만든다', () => {
    expect(
      eachDateInRange({ startDate: '2026-07-31', endDate: '2026-08-02' }),
    ).toEqual(['2026-07-31', '2026-08-01', '2026-08-02']);
  });
});

describe('formatPeriodLabel', () => {
  test('일은 날짜와 요일을 보여준다', () => {
    expect(
      formatPeriodLabel('DAY', {
        startDate: '2026-07-28',
        endDate: '2026-07-28',
      }),
    ).toBe('7.28 (화)');
  });

  test('주는 시작일과 끝일을 이어 보여준다', () => {
    expect(
      formatPeriodLabel('WEEK', {
        startDate: '2026-07-20',
        endDate: '2026-07-26',
      }),
    ).toBe('7.20 (월) - 7.26 (일)');
  });

  test('월은 연도와 월을 보여준다', () => {
    expect(
      formatPeriodLabel('MONTH', {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }),
    ).toBe('2026.07');
  });
});

describe('buildStepChartData', () => {
  const weekHistories = [
    { historyDate: '2026-07-20', step: 1_000, distance: 700, calories: 40 },
    { historyDate: '2026-07-21', step: 2_000, distance: 1_400, calories: 80 },
  ];

  test('주는 하루에 막대 하나를 요일 라벨로 만든다', () => {
    expect(buildStepChartData('WEEK', weekHistories, '2026-07-21')).toEqual([
      { label: '월', value: 1_000, highlighted: false },
      { label: '화', value: 2_000, highlighted: true },
    ]);
  });

  test('월은 7일씩 묶어 주 단위 막대로 줄인다', () => {
    const monthHistories = [
      { historyDate: '2026-07-01', step: 100, distance: 0, calories: 0 },
      { historyDate: '2026-07-07', step: 200, distance: 0, calories: 0 },
      { historyDate: '2026-07-08', step: 300, distance: 0, calories: 0 },
      { historyDate: '2026-07-31', step: 400, distance: 0, calories: 0 },
    ];

    // 기록이 없는 3~4주도 0으로 채워야 x축이 끊기지 않는다.
    expect(buildStepChartData('MONTH', monthHistories, '2026-07-08')).toEqual([
      { label: '1주', value: 300, highlighted: false },
      { label: '2주', value: 300, highlighted: true },
      { label: '3주', value: 0, highlighted: false },
      { label: '4주', value: 0, highlighted: false },
      { label: '5주', value: 400, highlighted: false },
    ]);
  });

  test('하루치는 추이가 되지 않아 막대를 만들지 않는다', () => {
    expect(buildStepChartData('DAY', weekHistories, '2026-07-20')).toEqual([]);
  });
});

describe('resolveChartCeiling', () => {
  test('기록이 없으면 기본 상한을 쓴다', () => {
    expect(resolveChartCeiling('DAY', 0)).toBe(2_000);
    expect(resolveChartCeiling('WEEK', 0)).toBe(8_000);
    expect(resolveChartCeiling('MONTH', 0)).toBe(80_000);
  });

  test('보통 하루치(6,000보)는 기본 상한 안에 여유 있게 담긴다', () => {
    // 6,000 / 8,000 = 75%. 평범한 날 막대가 천장에 붙지 않아야 한다.
    expect(resolveChartCeiling('WEEK', 6_000)).toBe(8_000);
    expect(resolveChartCeiling('MONTH', 48_600)).toBe(80_000);
  });

  test('주간은 8.0k에 가까워지면 2,000씩 올라간다', () => {
    // 상한의 90%인 7,200까지는 8.0k를 유지한다.
    expect(resolveChartCeiling('WEEK', 7_200)).toBe(8_000);
    expect(resolveChartCeiling('WEEK', 7_300)).toBe(10_000);
    expect(resolveChartCeiling('WEEK', 9_500)).toBe(12_000);
  });

  test('일간은 500 단위로 올라간다', () => {
    expect(resolveChartCeiling('DAY', 1_700)).toBe(2_000);
    expect(resolveChartCeiling('DAY', 1_900)).toBe(2_500);
  });

  test('월간은 20,000 단위로 올라간다', () => {
    expect(resolveChartCeiling('MONTH', 75_000)).toBe(100_000);
  });

  test('상한은 항상 데이터 최댓값보다 크다', () => {
    // 상한이 데이터보다 작으면 가장 큰 막대가 천장을 뚫는다.
    const samples = [0, 1, 999, 5_600, 8_000, 48_600, 250_000];

    (['DAY', 'WEEK', 'MONTH'] as const).forEach(period => {
      samples.forEach(dataMax => {
        expect(resolveChartCeiling(period, dataMax)).toBeGreaterThan(dataMax);
      });
    });
  });

  test('눈금 4단으로 나누면 딱 떨어지는 값이 나온다', () => {
    // chart-kit은 라벨을 (상한 / 눈금수) * i 로 만든다.
    expect(resolveChartCeiling('MONTH', 48_600) / 4).toBe(20_000);
    expect(resolveChartCeiling('DAY', 1_700) / 4).toBe(500);
    expect(resolveChartCeiling('WEEK', 6_000) / 4).toBe(2_000);
  });
});

describe('maxValue', () => {
  test('가장 큰 값을 준다', () => {
    expect(maxValue([3, 9, 4])).toBe(9);
  });

  test('빈 배열은 0이다', () => {
    expect(maxValue([])).toBe(0);
  });
});

describe('buildHourlyChartData', () => {
  const hourlySteps = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    step: hour * 10,
  }));

  test('00시부터 23시까지 하루를 다 그린다', () => {
    const data = buildHourlyChartData(hourlySteps);

    // 새벽을 잘라내면 위에 뜨는 하루 합계(자정부터)와 곡선의 합이 어긋난다.
    expect(data).toHaveLength(24);
    expect(data[0].value).toBe(0);
    expect(data[data.length - 1].value).toBe(230);
  });

  test('라벨은 3시간마다만 달고 나머지는 비운다', () => {
    const data = buildHourlyChartData(hourlySteps);

    // 24개 점에 라벨을 다 달면 겹친다.
    expect(data.map(datum => datum.label).filter(Boolean)).toEqual([
      '00',
      '03',
      '06',
      '09',
      '12',
      '15',
      '18',
      '21',
    ]);
    expect(data[1].label).toBe('');
  });

  test('빈 입력이면 빈 배열이다', () => {
    expect(buildHourlyChartData([])).toEqual([]);
  });
});

describe('formatWalkDateTime', () => {
  test('연월일과 요일, 시각을 붙인다', () => {
    expect(formatWalkDateTime('2026-07-20T20:00:00')).toBe(
      '2026.07.20 (월) 20:00',
    );
  });

  test('시각이 없으면 날짜만 보여준다', () => {
    expect(formatWalkDateTime('2026-07-20')).toBe('2026.07.20 (월)');
  });
});

describe('formatWalkDateRange', () => {
  test('하루 안에 끝났으면 날짜 하나로 줄인다', () => {
    expect(
      formatWalkDateRange('2026-07-26T10:00:00', '2026-07-26T11:00:00'),
    ).toBe('2026.07.26');
  });

  test('여러 날 열려 있었으면 두 날짜를 잇는다', () => {
    // 한 방은 최대 일주일까지 간다.
    expect(
      formatWalkDateRange('2026-05-14T10:00:00', '2026-05-21T10:00:00'),
    ).toBe('2026.05.14 - 2026.05.21');
  });

  test('요일과 시각은 넣지 않는다', () => {
    // 목록 카드가 한 줄만 써서 길어지면 잘린다. 자세한 시각은 상세 화면에 있다.
    const label = formatWalkDateRange(
      '2026-05-06T23:50:00',
      '2026-05-07T00:30:00',
    );

    expect(label).toBe('2026.05.06 - 2026.05.07');
    expect(label).not.toContain(':');
    expect(label).not.toContain('(');
  });

  test('아직 안 끝난 방은 시작 날짜만 보여준다', () => {
    expect(formatWalkDateRange('2026-05-14T10:00:00', null)).toBe('2026.05.14');
  });

  test('시각이 아예 없으면 빈 자리로 둔다', () => {
    expect(formatWalkDateRange(null, null)).toBe('-');
  });
});

describe('formatWalkDayRange', () => {
  test('요일은 붙이고 시각은 붙이지 않는다', () => {
    expect(
      formatWalkDayRange('2026-05-14T10:00:00', '2026-05-21T18:30:00'),
    ).toBe('2026.05.14 (목) - 2026.05.21 (목)');
  });

  test('하루 안에 끝났으면 날짜 하나로 줄인다', () => {
    expect(
      formatWalkDayRange('2026-07-26T10:00:00', '2026-07-26T11:00:00'),
    ).toBe('2026.07.26 (일)');
  });

  test('자정을 넘겼으면 두 날이라 이어 적는다', () => {
    expect(
      formatWalkDayRange('2026-05-06T23:50:00', '2026-05-07T00:30:00'),
    ).toBe('2026.05.06 (수) - 2026.05.07 (목)');
  });

  test('아직 안 끝난 방은 시작 날짜만 보여준다', () => {
    expect(formatWalkDayRange('2026-05-14T10:00:00', null)).toBe(
      '2026.05.14 (목)',
    );
  });
});

describe('formatThousands', () => {
  test('세 자리마다 쉼표를 넣는다', () => {
    expect(formatThousands(36_000)).toBe('36,000');
    expect(formatThousands(0)).toBe('0');
    expect(formatThousands(100)).toBe('100');
  });
});


describe('buildHistoryResponse (삼성헬스 -> 화면)', () => {
  const week = { period: 'WEEK' as const, date: '2026-07-20' };

  test('구간의 모든 날짜를 채우고 없는 날은 0으로 둔다', () => {
    // SDK는 기록이 없는 날의 버킷을 아예 내려주지 않는다.
    const response = buildHistoryResponse(week.period, week.date, [
      { date: '2026-07-20', steps: 4_231, distanceMeters: 3_200, activeCalories: 176 },
      { date: '2026-07-23', steps: 6_000, distanceMeters: 4_500, activeCalories: 240 },
    ]);

    expect(response.startDate).toBe('2026-07-20');
    expect(response.endDate).toBe('2026-07-26');
    expect(response.histories).toHaveLength(7);
    expect(response.histories[0]).toEqual({
      historyDate: '2026-07-20',
      step: 4_231,
      distance: 3_200,
      calories: 176,
    });
    // 21일·22일은 SDK가 안 내려줬으므로 0.
    expect(response.histories[1].step).toBe(0);
    expect(response.histories[2].step).toBe(0);
    expect(response.histories[3].step).toBe(6_000);
  });

  test('합계는 채워진 배열을 더한 값이다', () => {
    const response = buildHistoryResponse(week.period, week.date, [
      { date: '2026-07-20', steps: 1_000, distanceMeters: 700, activeCalories: 40 },
      { date: '2026-07-21', steps: 2_000, distanceMeters: 1_400, activeCalories: 80 },
    ]);

    expect(response.totalStep).toBe(3_000);
    expect(response.totalDistance).toBe(2_100);
    expect(response.totalCalories).toBe(120);
  });

  test('SDK의 소수 값을 정수로 반올림한다', () => {
    // 서버·화면 모두 정수로 다루는데 SDK는 Float을 준다.
    const response = buildHistoryResponse('DAY', '2026-07-20', [
      { date: '2026-07-20', steps: 4_231, distanceMeters: 3_200.7, activeCalories: 176.4 },
    ]);

    expect(response.histories[0].distance).toBe(3_201);
    expect(response.histories[0].calories).toBe(176);
  });

  test('구간 밖 날짜는 무시한다', () => {
    const response = buildHistoryResponse(week.period, week.date, [
      { date: '2026-07-19', steps: 9_999, distanceMeters: 0, activeCalories: 0 },
    ]);

    expect(response.totalStep).toBe(0);
    expect(response.histories).toHaveLength(7);
  });

  test('기록이 하나도 없으면 전부 0이다', () => {
    const response = buildHistoryResponse(week.period, week.date, []);

    expect(response.totalStep).toBe(0);
    expect(response.histories).toHaveLength(7);
    expect(response.histories.every(day => day.step === 0)).toBe(true);
  });
});

describe('buildHourlySteps (삼성헬스 -> 화면)', () => {
  test('0~23시를 모두 만들고 없는 시간대는 0으로 둔다', () => {
    // 걸음이 없는 시간대는 버킷이 안 와서, 그대로 쓰면 x축에 구멍이 생긴다.
    const hourly = buildHourlySteps([
      { hour: 7, steps: 800 },
      { hour: 18, steps: 1_500 },
    ]);

    expect(hourly).toHaveLength(24);
    expect(hourly[0]).toEqual({ hour: 0, step: 0 });
    expect(hourly[7]).toEqual({ hour: 7, step: 800 });
    expect(hourly[18]).toEqual({ hour: 18, step: 1_500 });
    expect(hourly[23]).toEqual({ hour: 23, step: 0 });
  });

  test('시간이 뒤섞여 와도 시각 순서로 만든다', () => {
    const hourly = buildHourlySteps([
      { hour: 20, steps: 300 },
      { hour: 6, steps: 100 },
    ]);

    expect(hourly.map(entry => entry.hour)).toEqual(
      Array.from({ length: 24 }, (_, hour) => hour),
    );
    expect(hourly[6].step).toBe(100);
    expect(hourly[20].step).toBe(300);
  });

  test('빈 입력이면 종일 0이다', () => {
    const hourly = buildHourlySteps([]);

    expect(hourly).toHaveLength(24);
    expect(hourly.every(entry => entry.step === 0)).toBe(true);
  });
});

const gameResultResponse = {
  gameId: 7,
  roomId: 12,
  roomName: '민서와의 산책',
  mode: 'COOPERATE' as const,
  roomStatus: 'COMPLETED' as const,
  result: true,
  boardSize: 3,
  targetBingoCount: 2,
  targetStepCount: 5_000,
  bingoCount: 2,
  completedMissionCount: 6,
  rewardCash: 300,
  startedAt: '2026-07-20T20:00:00',
  completedAt: '2026-07-20T20:12:31',
  totalMissionCount: 9,
  myCompletedMissionCount: 4,
  myRewardCash: 120,
  myResult: null,
  participants: [
    {
      memberId: 102,
      nickname: '민서',
      completedMissionCount: 2,
      rewardCash: 90,
      result: null,
    },
    {
      memberId: 101,
      nickname: '걷는곰',
      completedMissionCount: 4,
      rewardCash: 120,
      result: null,
    },
  ],
};

function buildCells(
  boardSize: number,
  approvedBy: Record<number, number | null>,
) {
  return Array.from({ length: boardSize * boardSize }, (_, index) => {
    const submittedByMemberId = approvedBy[index] ?? null;

    return {
      cellId: index + 1,
      row: Math.floor(index / boardSize),
      col: index % boardSize,
      mission: { missionId: index + 1, title: `미션 ${index}` },
      verificationStatus:
        submittedByMemberId === null
          ? ('PENDING' as const)
          : ('APPROVED' as const),
      submittedByMemberId,
    };
  });
}

const detailResponse = {
  ...gameResultResponse,
  bingoBoards: [
    {
      bingoBoardId: 1,
      owners: [
        { memberId: 101, nickname: '걷는곰' },
        { memberId: 102, nickname: '민서' },
      ],
      boardSize: 3,
      totalCellCount: 9,
      approvedCellCount: 6,
      cells: buildCells(3, { 0: 101, 1: 102, 3: 101, 5: 102, 7: 101, 8: 101 }),
    },
  ],
};


describe('formatWalkResult', () => {
  test('대결만 승패로 읽힌다', () => {
    expect(formatWalkResult('BATTLE', true)).toBe('승리');
    expect(formatWalkResult('BATTLE', false)).toBe('패배');
  });

  test('혼자·협동은 목표 달성 여부다', () => {
    expect(formatWalkResult('SINGLE', true)).toBe('성공');
    expect(formatWalkResult('COOPERATE', false)).toBe('실패');
  });
});

describe('toWalkRecord', () => {
  test('목록에 필요한 값으로 옮긴다', () => {
    const record = toWalkRecord(gameResultResponse);

    expect(record.roomId).toBe(12);
    expect(record.title).toBe('민서와의 산책');
    expect(record.mode).toBe('COOPERATE');
    expect(record.startedAt).toBe('2026-07-20T20:00:00');
    expect(record.completedAt).toBe('2026-07-20T20:12:31');
    expect(record.myCompletedMissionCount).toBe(4);
    expect(record.participants).toEqual([
      { memberId: 102, nickname: '민서' },
      { memberId: 101, nickname: '걷는곰' },
    ]);
  });

  test('미션 분모는 판 하나의 칸 수다', () => {
    // totalMissionCount는 모든 판을 더한 값이라 대결에서는 내 몫의 분모가 아니다.
    const record = toWalkRecord({
      ...gameResultResponse,
      mode: 'BATTLE',
      boardSize: 3,
      totalMissionCount: 18,
      myResult: true,
    });

    expect(record.boardCellCount).toBe(9);
  });

  test('대결은 내 승패를, 그 외에는 게임 결과를 쓴다', () => {
    expect(toWalkRecord({ ...gameResultResponse, myResult: null }).isWin).toBe(
      true,
    );
    expect(
      toWalkRecord({
        ...gameResultResponse,
        mode: 'BATTLE',
        result: true,
        myResult: false,
      }).isWin,
    ).toBe(false);
  });

  test('아직 안 끝난 방은 종료 시각이 없다', () => {
    const record = toWalkRecord({ ...gameResultResponse, completedAt: null });

    expect(record.completedAt).toBeNull();
  });
});

describe('toWalkDetail', () => {
  const MY_MEMBER_ID = 101;

  test('본인이 참가자 맨 앞에 온다', () => {
    const detail = toWalkDetail(detailResponse, MY_MEMBER_ID);

    expect(detail.participants.map(participant => participant.memberId)).toEqual(
      [101, 102],
    );
    expect(detail.participants[0].isMe).toBe(true);
    expect(detail.participants[1].isMe).toBe(false);
  });

  test('칸 번호는 행·열로 매긴다', () => {
    const detail = toWalkDetail(detailResponse, MY_MEMBER_ID);

    expect(detail.bingoSize).toBe(3);
    expect(detail.bingoCells).toHaveLength(9);
    expect(detail.bingoCells.map(cell => cell.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  test('승인된 칸만 완료로 친다', () => {
    const detail = toWalkDetail(detailResponse, MY_MEMBER_ID);

    expect(detail.bingoCells[0].completedBy).toBe(101);
    expect(detail.bingoCells[1].completedBy).toBe(102);
    // 아무도 손대지 않은 칸.
    expect(detail.bingoCells[2].completedBy).toBeNull();
  });

  test('사진을 냈어도 승인 전이면 빈 칸이다', () => {
    const [pending, ...rest] = detailResponse.bingoBoards[0].cells;
    const detail = toWalkDetail(
      {
        ...detailResponse,
        bingoBoards: [
          {
            ...detailResponse.bingoBoards[0],
            cells: [
              { ...pending, verificationStatus: 'PENDING' as const },
              ...rest,
            ],
          },
        ],
      },
      MY_MEMBER_ID,
    );

    expect(detail.bingoCells[0].completedBy).toBeNull();
  });

  test('대결에서는 내가 주인인 판을 고른다', () => {
    const myBoard = {
      ...detailResponse.bingoBoards[0],
      bingoBoardId: 2,
      owners: [{ memberId: MY_MEMBER_ID, nickname: '걷는곰' }],
      cells: buildCells(3, { 4: MY_MEMBER_ID }),
    };
    const rivalBoard = {
      ...detailResponse.bingoBoards[0],
      bingoBoardId: 3,
      owners: [{ memberId: 102, nickname: '민서' }],
      cells: buildCells(3, { 0: 102, 1: 102 }),
    };

    const detail = toWalkDetail(
      {
        ...detailResponse,
        mode: 'BATTLE',
        myResult: true,
        bingoBoards: [rivalBoard, myBoard],
      },
      MY_MEMBER_ID,
    );

    expect(
      detail.bingoCells.filter(cell => cell.completedBy !== null),
    ).toHaveLength(1);
    expect(detail.bingoCells[4].completedBy).toBe(MY_MEMBER_ID);
  });

  test('빙고판이 없으면 칸 없이 그린다', () => {
    const detail = toWalkDetail(
      { ...detailResponse, bingoBoards: [] },
      MY_MEMBER_ID,
    );

    expect(detail.bingoCells).toEqual([]);
    // 판이 없어도 방의 boardSize로 크기를 잡는다.
    expect(detail.bingoSize).toBe(3);
  });
});


describe('resolveBarPercentage', () => {
  // chart-kit은 막대 폭을 `32 * barPercentage`로 계산한다.
  const barWidthOf = (percentage: number) => 32 * percentage;

  test('마지막 막대의 오른쪽 끝이 그림 영역 끝과 맞는다', () => {
    const plotWidth = 280;
    const barCount = 7;
    const barWidth = barWidthOf(resolveBarPercentage(plotWidth, barCount));
    const slot = plotWidth / barCount;

    // chart-kit이 막대를 놓는 위치: 칸 시작 + barWidth / 2.
    const lastBarRight = (barCount - 1) * slot + barWidth / 2 + barWidth;

    expect(lastBarRight).toBeCloseTo(plotWidth);
  });

  test('막대 수가 적으면 막대가 굵어진다', () => {
    const plotWidth = 280;

    // 월간(5칸)이 주간(7칸)보다 굵어야 칸을 같은 비율로 채운다.
    expect(barWidthOf(resolveBarPercentage(plotWidth, 5))).toBeGreaterThan(
      barWidthOf(resolveBarPercentage(plotWidth, 7)),
    );
  });

  test('차트가 넓어지면 막대도 같이 굵어진다', () => {
    // 고정 비율로 두면 넓은 화면에서 오른쪽이 비는 문제를 막는 성질.
    expect(barWidthOf(resolveBarPercentage(560, 7))).toBeCloseTo(
      barWidthOf(resolveBarPercentage(280, 7)) * 2,
    );
  });

  test('막대는 칸을 넘지 않는다', () => {
    const plotWidth = 280;

    [1, 5, 7, 18, 31].forEach(barCount => {
      const slot = plotWidth / barCount;
      const barWidth = barWidthOf(resolveBarPercentage(plotWidth, barCount));

      expect(barWidth).toBeLessThanOrEqual(slot);
    });
  });

  test('폭이나 개수가 0이면 안전한 기본값을 준다', () => {
    expect(resolveBarPercentage(0, 7)).toBe(1);
    expect(resolveBarPercentage(280, 0)).toBe(1);
  });
});
