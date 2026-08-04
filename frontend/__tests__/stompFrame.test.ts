/**
 * @format
 */

import {
  decodeFrames,
  encodeFrame,
  negotiateHeartBeat,
  parseHeartBeat,
} from '../src/shared/lib/stompFrame';

describe('encodeFrame', () => {
  test('커맨드·헤더·본문을 NULL로 끝나는 한 덩어리로 만든다', () => {
    const payload = encodeFrame({
      command: 'SUBSCRIBE',
      headers: { id: 'sub-1', destination: '/topic/rooms/7/battle-progress' },
      body: '',
    });

    expect(payload).toBe(
      'SUBSCRIBE\nid:sub-1\ndestination:/topic/rooms/7/battle-progress\n\n\0',
    );
  });

  test('헤더가 없어도 빈 줄로 본문과 가른다', () => {
    expect(encodeFrame({ command: 'DISCONNECT', headers: {}, body: '' })).toBe(
      'DISCONNECT\n\n\0',
    );
  });

  test('헤더 값의 콜론·개행·역슬래시를 이스케이프한다', () => {
    const payload = encodeFrame({
      command: 'SEND',
      headers: { note: 'a:b\nc\\d' },
      body: '',
    });

    expect(payload).toBe('SEND\nnote:a\\cb\\nc\\\\d\n\n\0');
  });

  test('CONNECT는 이스케이프하지 않는다', () => {
    // 버전을 합의하기 전에 오가는 프레임이라 규칙을 정할 수가 없다.
    // Bearer 토큰에 콜론이 없어 실제로도 문제가 되지 않는다.
    const payload = encodeFrame({
      command: 'CONNECT',
      headers: { host: 'localhost:8080' },
      body: '',
    });

    expect(payload).toBe('CONNECT\nhost:localhost:8080\n\n\0');
  });
});

describe('decodeFrames', () => {
  test('커맨드와 헤더, 본문을 갈라 읽는다', () => {
    const { frames, rest } = decodeFrames(
      'MESSAGE\nsubscription:sub-1\ndestination:/topic/a\n\n{"step":10}\0',
    );

    expect(rest).toBe('');
    expect(frames).toEqual([
      {
        command: 'MESSAGE',
        headers: { subscription: 'sub-1', destination: '/topic/a' },
        body: '{"step":10}',
      },
    ]);
  });

  test('한 청크에 붙어 온 프레임을 모두 꺼낸다', () => {
    const { frames } = decodeFrames(
      'MESSAGE\nsubscription:sub-1\n\nfirst\0MESSAGE\nsubscription:sub-1\n\nsecond\0',
    );

    expect(frames.map(frame => frame.body)).toEqual(['first', 'second']);
  });

  test('잘려서 온 프레임은 다음 청크를 기다린다', () => {
    const first = decodeFrames('MESSAGE\nsubscription:sub-1\n\n{"ste');

    expect(first.frames).toHaveLength(0);
    expect(first.rest).toBe('MESSAGE\nsubscription:sub-1\n\n{"ste');

    const second = decodeFrames(`${first.rest}p":10}\0`);

    expect(second.frames).toHaveLength(1);
    expect(second.frames[0].body).toBe('{"step":10}');
    expect(second.rest).toBe('');
  });

  test('프레임 사이의 하트비트 개행을 건너뛴다', () => {
    const { frames, rest } = decodeFrames('\n\nMESSAGE\nsubscription:sub-1\n\nbody\0\n');

    expect(frames).toHaveLength(1);
    expect(rest).toBe('');
  });

  test('하트비트만 온 청크는 프레임을 만들지 않는다', () => {
    expect(decodeFrames('\n')).toEqual({ frames: [], rest: '' });
  });

  test('본문이 비어 있어도 프레임으로 읽는다', () => {
    const { frames } = decodeFrames('CONNECTED\nversion:1.2\n\n\0');

    expect(frames[0]).toEqual({
      command: 'CONNECTED',
      headers: { version: '1.2' },
      body: '',
    });
  });

  test('본문에 한글이 섞여도 NULL까지 그대로 읽는다', () => {
    // content-length를 믿으면 바이트 수와 UTF-16 길이가 어긋나 본문이 잘린다.
    const { frames } = decodeFrames(
      'MESSAGE\nsubscription:sub-1\ncontent-length:24\n\n{"name":"민서"}\0',
    );

    expect(frames[0].body).toBe('{"name":"민서"}');
  });

  test('CRLF로 끝나는 줄도 읽는다', () => {
    const { frames } = decodeFrames(
      'MESSAGE\r\nsubscription:sub-1\r\n\r\nbody\0',
    );

    expect(frames[0]).toEqual({
      command: 'MESSAGE',
      headers: { subscription: 'sub-1' },
      body: 'body',
    });
  });

  test('이스케이프된 헤더 값을 되돌린다', () => {
    const { frames } = decodeFrames('MESSAGE\nnote:a\\cb\\nc\\\\d\n\n\0');

    expect(frames[0].headers.note).toBe('a:b\nc\\d');
  });

  test('CONNECTED 헤더는 되돌리지 않는다', () => {
    const { frames } = decodeFrames('CONNECTED\nhost:localhost\\cpath\n\n\0');

    expect(frames[0].headers.host).toBe('localhost\\cpath');
  });

  test('같은 헤더가 여러 번 오면 맨 앞이 이긴다', () => {
    const { frames } = decodeFrames(
      'MESSAGE\nsubscription:sub-1\nsubscription:sub-2\n\n\0',
    );

    expect(frames[0].headers.subscription).toBe('sub-1');
  });

  test('빈 줄이 없는 조각은 프레임으로 세지 않는다', () => {
    // 헤더와 본문을 가르는 빈 줄이 없으면 프레임이 아니다.
    expect(decodeFrames('GARBAGE\0').frames).toHaveLength(0);
  });
});

describe('parseHeartBeat', () => {
  test('보내기·받기 간격을 숫자로 읽는다', () => {
    expect(parseHeartBeat('10000,20000')).toEqual([10_000, 20_000]);
  });

  test('헤더가 없으면 하트비트를 쓰지 않는다', () => {
    expect(parseHeartBeat(undefined)).toEqual([0, 0]);
  });

  test('읽을 수 없는 값은 0으로 둔다', () => {
    expect(parseHeartBeat('abc,10000')).toEqual([0, 10_000]);
  });
});

describe('negotiateHeartBeat', () => {
  test('둘 중 느슨한 쪽에 맞춘다', () => {
    expect(negotiateHeartBeat([10_000, 10_000], [20_000, 5_000])).toEqual({
      sendEvery: 10_000,
      expectEvery: 20_000,
    });
  });

  test('상대가 못 받겠다면 보내지 않는다', () => {
    // 서버가 "받고 싶은 간격 0" = 하트비트를 못 받는다는 뜻이다.
    expect(negotiateHeartBeat([10_000, 10_000], [10_000, 0])).toEqual({
      sendEvery: 0,
      expectEvery: 10_000,
    });
  });

  test('상대가 못 보내겠다면 기다리지 않는다', () => {
    expect(negotiateHeartBeat([10_000, 10_000], [0, 10_000])).toEqual({
      sendEvery: 10_000,
      expectEvery: 0,
    });
  });
});
