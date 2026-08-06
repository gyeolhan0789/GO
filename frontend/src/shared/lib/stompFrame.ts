// STOMP 1.2 프레임 코덱. 소켓도 타이머도 모르는 순수 함수만 둔다 —
// 연결 수명은 shared/api/stompClient가 맡는다.
//
// 라이브러리(@stomp/stompjs)를 쓰지 않는 이유: RN 0.86에는 TextEncoder 전역이
// 없어 폴리필이 더 필요해질 수 있고, 우리가 쓰는 건 구독뿐이라 표면이 작다.

/** 프레임의 끝. 본문 뒤에 이 한 바이트가 붙는다. */
const NULL = '\0';

/** 하트비트는 프레임이 아니라 개행 한 글자로 온다. */
export const HEARTBEAT_FRAME = '\n';

export type StompFrame = {
  command: string;
  headers: Record<string, string>;
  body: string;
};

/**
 * CONNECT와 CONNECTED만 헤더 이스케이프에서 빠진다. STOMP 1.0에는 이스케이프가
 * 없었고, 두 프레임은 버전을 합의하기 *전에* 오가서 규칙을 정할 수가 없다.
 */
function isEscapeExempt(command: string): boolean {
  return command === 'CONNECT' || command === 'CONNECTED';
}

/** 역슬래시를 먼저 바꿔야 뒤에 새로 생긴 역슬래시를 다시 건드리지 않는다. */
function escapeHeaderValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/:/g, '\\c');
}

function unescapeHeaderValue(value: string): string {
  return value.replace(/\\(.)/g, (match, escaped: string) => {
    switch (escaped) {
      case 'r':
        return '\r';
      case 'n':
        return '\n';
      case 'c':
        return ':';
      case '\\':
        return '\\';
      default:
        // 규약에 없는 조합. 끊어버리는 것보다 원문을 그대로 두는 편이 낫다.
        return match;
    }
  });
}

export function encodeFrame(frame: StompFrame): string {
  const exempt = isEscapeExempt(frame.command);
  const headerLines = Object.entries(frame.headers).map(([name, value]) => {
    return exempt
      ? `${name}:${value}`
      : `${escapeHeaderValue(name)}:${escapeHeaderValue(value)}`;
  });

  return `${[frame.command, ...headerLines].join('\n')}\n\n${frame.body}${NULL}`;
}

/**
 * 프레임 문자열을 UTF-8 바이트로 바꾼다(표준 UTF-8, U+0000은 0x00 한 바이트).
 *
 * 문자열 그대로 socket.send에 주면 안 된다 — RN 안드로이드 브리지가 NUL을
 * 문자열의 끝으로 보고 종결자를 잘라먹는 걸 전선 검식으로 확인했다(2026-08-05,
 * okhttp 수신측 tailHex에 0x00 부재). 종결자가 없는 프레임은 서버 디코더가
 * 끝을 영영 기다리므로 응답이 오지 않는다. 바이트로 보내면 브리지의 문자열
 * 처리를 우회한다.
 *
 * RN 0.86에는 TextEncoder 전역이 없어 직접 쓴다.
 */
// UTF-8 인코딩은 비트 연산 없이 쓸 수 없다. 이 함수에만 허용한다.
/* eslint-disable no-bitwise */
export function encodeFrameBytes(frame: StompFrame): Uint8Array {
  const text = encodeFrame(frame);
  const bytes: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);

    // 서로게이트 쌍(이모지 등)은 하나의 코드포인트로 합쳐 4바이트로 나간다.
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const low = text.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        index += 1;
      }
    }

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return Uint8Array.from(bytes);
}
/* eslint-enable no-bitwise */

type DecodeResult = {
  frames: StompFrame[];
  /** 아직 NULL을 못 만난 나머지. 다음 청크 앞에 이어 붙인다. */
  rest: string;
};

/**
 * 버퍼에서 완성된 프레임만 꺼낸다.
 *
 * 소켓은 프레임 경계를 지켜 주지 않는다 — 한 청크에 여러 프레임이 올 수도,
 * 한 프레임이 여러 청크로 쪼개져 올 수도 있다. 그래서 호출부가 rest를 들고
 * 있다가 다음 청크 앞에 붙여 다시 부른다.
 *
 * content-length는 읽지 않고 NULL로 끊는다. 그 값은 바이트 수인데 JS 문자열은
 * UTF-16 단위라 한글이 섞이면 어긋난다.
 */
export function decodeFrames(buffer: string): DecodeResult {
  const frames: StompFrame[] = [];
  let rest = buffer;

  for (;;) {
    // 프레임 사이의 하트비트(개행)를 먼저 걷어낸다.
    rest = rest.replace(/^(\r?\n)+/, '');

    const end = rest.indexOf(NULL);
    if (end === -1) {
      return { frames, rest };
    }

    const raw = rest.slice(0, end);
    rest = rest.slice(end + 1);

    const frame = parseFrame(raw);
    if (frame !== null) {
      frames.push(frame);
    }
  }
}

function parseFrame(raw: string): StompFrame | null {
  const separator = raw.search(/\r?\n\r?\n/);
  // 헤더와 본문을 가르는 빈 줄이 없으면 프레임이 아니다.
  if (separator === -1) {
    return null;
  }

  const head = raw.slice(0, separator);
  const body = raw.slice(separator).replace(/^\r?\n\r?\n/, '');

  const [command, ...headerLines] = head.split(/\r?\n/);
  if (!command) {
    return null;
  }

  const exempt = isEscapeExempt(command);
  const headers: Record<string, string> = {};

  headerLines.forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) {
      return;
    }

    const name = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const key = exempt ? name : unescapeHeaderValue(name);

    // 같은 헤더가 여러 번 오면 맨 앞이 이긴다(STOMP 1.2).
    if (!(key in headers)) {
      headers[key] = exempt ? value : unescapeHeaderValue(value);
    }
  });

  return { command, headers, body };
}

/**
 * 'heart-beat: 보낼 수 있는 최소 간격, 받고 싶은 간격'을 [보내기, 받기]로 읽는다.
 * 헤더가 없으면 양쪽 다 0(하트비트 없음)이다.
 */
export function parseHeartBeat(header: string | undefined): [number, number] {
  if (header === undefined) {
    return [0, 0];
  }

  const [send, receive] = header.split(',').map(part => Number(part.trim()));

  return [
    Number.isFinite(send) ? send : 0,
    Number.isFinite(receive) ? receive : 0,
  ];
}

/**
 * 내가 보낼 간격과 받기를 기대할 간격.
 *
 * **받기**는 규약대로 협상한다 — 서버가 "못 보낸다"(0)고 하면 기다리지 않는다.
 * 없는 하트비트를 기다리다 멀쩡한 연결을 끊으면 안 된다.
 *
 * **보내기**는 서버가 "안 받겠다"(0)고 해도 우리 최소 간격으로 보낸다. 규약대로
 * 끄면 이벤트가 없는 동안 소켓에 한 바이트도 흐르지 않는데, 모바일 통신사 NAT는
 * 그런 유휴 TCP를 30~120초 사이에 걷어낸다(2026-08-06 실기기 LTE에서 18~187초
 * 간격으로 `1006 Software caused connection abort` 재현). 재연결이 받쳐줘도
 * 6~8초의 공백이 생기고, 그 사이에 온 이벤트는 브로커가 재전송하지 않아 사라진다.
 *
 * 프레임 사이의 개행은 규약상 수신측이 무시하게 되어 있어 서버에 해가 없다.
 */
export function negotiateHeartBeat(
  mine: [number, number],
  theirs: [number, number],
): { sendEvery: number; expectEvery: number } {
  const [mySend, myReceive] = mine;
  const [theirSend, theirReceive] = theirs;

  return {
    sendEvery: mySend === 0 ? 0 : Math.max(mySend, theirReceive),
    expectEvery:
      myReceive === 0 || theirSend === 0 ? 0 : Math.max(myReceive, theirSend),
  };
}
