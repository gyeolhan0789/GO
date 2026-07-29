/**
 * 백엔드에 산책 단위 기록 API가 없다. /histories는 날짜별 합계만 주고 산책 시각·
 * 소요 시간이 없어서, 화면에 필요한 값으로 먼저 정의했다.
 */
export type RecentWalk = {
  walkId: number;
  /** 산책방 이름. 혼자 걸었으면 그 방 이름이 그대로 온다. */
  title: string;
  /** 산책 시작 시각 'yyyy-MM-ddTHH:mm:ss'. */
  startedAt: string;
  step: number;
  /** 소요 시간(초). */
  durationSeconds: number;
  participants: RecentWalkParticipant[];
};

/** 하루 안의 시간대별 걸음. 일간 차트가 쓴다. */
export type HourlyStep = {
  /** 0~23. 그 시간대가 시작하는 시각. */
  hour: number;
  step: number;
};

export type RecentWalkParticipant = {
  memberId: number;
  nickname: string;
  /** 캐릭터 이미지. 없으면 빈 아바타로 그린다. */
  imageUrl?: string;
};

/** 백엔드 SliceResponse와 같은 형태. 전체 개수 없이 다음 페이지 유무만 준다. */
export type WalkPage = {
  content: RecentWalk[];
  hasNext: boolean;
};

/** 전체 산책 목록의 정렬 기준. */
export type WalkSort = 'latest' | 'oldest' | 'mostSteps';

/** 전체 산책 목록의 인원 필터. */
export type WalkFilter = 'all' | 'solo' | 'group';

/** 날짜를 직접 찍는 대신 흔한 구간을 고른다. */
export type WalkDatePreset =
  | 'all'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth';

/** 양쪽 다 포함. null이면 기간 제한 없음. */
export type WalkDateRange = {
  /** 'yyyy-MM-dd'. */
  startDate: string;
  /** 'yyyy-MM-dd'. */
  endDate: string;
};

/** 한 사람이 그 산책에서 남긴 수치. */
export type WalkStats = {
  step: number;
  /** 소요 시간(초). */
  durationSeconds: number;
  /** 미터. */
  distance: number;
  /** kcal. */
  calories: number;
};

/** 사람마다 걸음·거리가 달라서 수치를 각자 들고 있다. */
export type WalkDetailParticipant = RecentWalkParticipant & {
  /** 본인인지. 목록 맨 앞에 두고 처음에 선택해둔다. */
  isMe: boolean;
  stats: WalkStats;
};

export type WalkBingoCell = {
  /** 판 왼쪽 위부터 0으로 시작하는 칸 번호. */
  index: number;
  missionTitle: string;
  /** 이 칸을 완료한 사람의 memberId. 아무도 못 했으면 null. */
  completedBy: number | null;
};

/**
 * 백엔드에 산책 단위 기록 API가 없다(RecentWalk 주석 참고).
 * /game-results에도 칸별 완료자가 없어서 화면에 필요한 값으로 먼저 정의했다.
 */
export type WalkDetail = {
  walkId: number;
  title: string;
  /** 산책 시작 시각 'yyyy-MM-ddTHH:mm:ss'. */
  startedAt: string;
  /** 산책 종료 시각 'yyyy-MM-ddTHH:mm:ss'. */
  endedAt: string;
  // 목표 걸음은 담지 않는다. 목표에 도달하면 산책이 끝나므로 진행률이 늘 100%다.
  participants: WalkDetailParticipant[];
  /** 한 변의 칸 수. features/bingo의 BingoBoardSize와 같다. */
  bingoSize: 3 | 4 | 5;
  bingoCells: WalkBingoCell[];
};
