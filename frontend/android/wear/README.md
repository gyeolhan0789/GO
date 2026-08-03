# 갤럭시 워치 컴패니언 (`:wear`)

갤럭시 워치 4 이상(Wear OS 3+)에서 도는 Kotlin + Compose for Wear OS 앱입니다.
React Native는 Wear OS에서 돌지 않아 별도 Gradle 모듈로 만들었습니다.

```
홈(캐릭터·오늘 걸음수) -> 산책방 선택(혼자/같이) -> 진행 중(시간·걸음) -> 종료 확인 -> 홈
```

홈의 두 입구는 폰 홈의 혼자하기·같이하기와 같은 자리입니다. 다만 워치는 방을
새로 만들지 못해서(서버 호출은 폰 몫) 두 버튼 모두 "그 모드의 참여 중인 방
목록"으로 들어갑니다.

## 구조

폰이 상태의 주인인 **컴패니언** 구조입니다. 워치는 서버를 직접 부르지 않으므로
로그인·API 호출·기록 저장은 전부 폰에 남고, 워치는 폰이 밀어준 값을 그리고
누른 것을 폰으로 되돌려 보냅니다. 그래서 폰이 블루투스 범위 안에 있어야 합니다.

| 방향 | 수단 | 내용 |
| --- | --- | --- |
| 폰 -> 워치 | `DataClient` | 닉네임, 오늘 걸음/거리/칼로리, 산책방 목록, 진행 중인 세션 |
| 폰 -> 워치 | `DataClient` (Asset) | 합성된 캐릭터 PNG |
| 워치 -> 폰 | `MessageClient` | `start-walk`(방 ID), `end-walk`, `toggle-pause`, `request-sync` |

경로와 키는 `android/wear-protocol/`의 `WearProtocol` 하나로 고정하고 `:app`과
`:wear`가 같이 컴파일합니다. 한쪽만 바꿔서 조용히 안 맞는 걸 막기 위해서입니다.

폰 쪽 절반은 다음에 있습니다.

- `android/app/.../wearbridge/` — 네이티브 모듈(`WearBridge`)과 수신 서비스
- `src/shared/lib/wearBridge.ts` — JS 래퍼
- `src/features/wear/` — 상태를 밀고 명령을 받는 훅

## 왜 이렇게 했는지

**걸음수는 폰 값을 그대로 미러링합니다.** 워치에도 걸음 센서가 있지만, 서버에
저장되는 기록은 폰의 삼성헬스 값이라 워치가 자기 센서를 쓰면 두 화면의 숫자가
어긋납니다.

**캐릭터는 폰에서 한 장으로 합쳐 보냅니다.** 워치가 이미지 URL을 직접 받게 하면
두 군데서 깨집니다. 개발 환경 백엔드는 `adb reverse`로 폰에만 열려 있고,
목업 모드(`characterMocks.ts`)에서는 레이어가 서버 URL이 아니라 번들 에셋입니다.

**경과 시간만 워치가 자기 시계로 셉니다.** 1초마다 DataItem을 밀 수는 없고, 폰과
워치의 벽시계를 맞춰 쓰면 시계 오차가 그대로 경과 시간 오차가 됩니다. 그래서
폰이 보낸 경과 초를 받은 순간부터 `SystemClock.elapsedRealtime()`으로 이어 셉니다.

**화면 이동은 폰의 세션 유무만 따릅니다.** 워치에서 "시작"을 눌러도 폰이 세션을
만들어 되밀어줘야 진행 중 화면으로 넘어갑니다. 덕분에 폰에서 시작하거나 종료해도
워치가 똑같이 따라옵니다.

## 실행

`:app`과 **applicationId(`com.wecandoit`)와 서명 키가 같아야** Data Layer가 두 앱을
한 쌍으로 인식합니다. 둘 다 `app/debug.keystore`로 서명합니다.

```bash
# 워치를 adb에 붙인 뒤 (adb devices로 확인)
npm run wear:install

# 특정 기기를 지정할 때
cd android && ./gradlew :wear:installDebug -Pandroid.injected.device=<serial>
```

폰과 워치가 각각 다른 기기이므로 `adb -s <serial> install` 로 나눠 설치합니다.
폰 앱은 평소대로 `npm run android:dev` 등을 씁니다.

## 아직 안 된 것

- 워치에서 방을 새로 만들 수는 없습니다(폰에서 만든 방만 고를 수 있습니다).
- 목표 걸음수가 서버에 없어 진행률 링이 안 그려집니다(`goalSteps: 0`).
  폰 홈 화면도 같은 이유로 목업 상수를 쓰고 있습니다.
- 타일/컴플리케이션, 워치 단독 실행(오프라인 큐)은 범위 밖입니다.
