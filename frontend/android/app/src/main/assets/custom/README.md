# 폰트

앱에서 쓰는 커스텀 폰트(.ttf)를 이 폴더에 둡니다.

## 중요: 굵기(weight)는 "파일 하나당 fontFamily 하나"로 관리

RN Android에서는 커스텀 폰트에 `fontWeight`를 줘도 잘 적용되지 않습니다(시스템 폰트로 fallback).
그래서 **굵기마다 정적(static) TTF를 따로 넣고, `fontFamily`로 굵기를 선택**합니다.

| 파일 | 코드의 fontFamily | 용도 |
|---|---|---|
| `BMDOHYEON.ttf` | `BMDOHYEON` | 온보딩 큰 제목 (배민 도현체) |
| `NotoSansKR-Regular.ttf` | `NotoSansKR-Regular` | 본문/작은 텍스트 |
| `NotoSansKR-Bold.ttf` | `NotoSansKR-Bold` | 버튼 등 굵은 텍스트 |

```ts
// fontWeight 쓰지 말고 fontFamily로 굵기 선택
description: { fontFamily: 'NotoSansKR-Regular' },
nextText:    { fontFamily: 'NotoSansKR-Bold' },
```

## 굵기 추가

Noto Sans KR 정적 파일은 굵기당 약 5.9MB라, 실제 쓰는 굵기만 넣습니다(9개 전부 넣으면 ~53MB).
다른 굵기(Medium/SemiBold 등)가 필요하면:

1. `NotoSansKR-<Weight>.ttf`를 이 폴더에 추가 (예: `NotoSansKR-SemiBold.ttf`)
2. 코드에서 `fontFamily: 'NotoSansKR-SemiBold'`로 사용
3. 아래 연결 + 재빌드

## 폰트 추가/교체 후

```bash
npx react-native-asset   # 네이티브 에셋 연결
npm run android          # 폰트는 빌드 시 번들되므로 재빌드 필요
```
