# 출처 및 라이선스 고지 (CREDITS)

이 문서는 **GO!** 프로젝트가 사용·재배포하는 서드파티 리소스의 출처와 라이선스를 명시합니다.

---

## 1. 저작물 구분

| 구분               | 내용                                                                      | 비고                                        |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------- |
| **팀 자체 제작**   | 애플리케이션 소스 코드 전체 (frontend / backend / ai / infra / load-test) | 외부 스켈레톤 코드 없음                     |
| **생성형 AI 활용** | 빙고 미션 아이콘 SVG 52종, 캐릭터·아바타 에셋                             | 아래 [5. 생성형 AI](#5-생성형-ai-활용) 참고 |
| **생성형 AI 활용** | 서비스 배너 이미지 (`image.png`)                                          | 아래 [5. 생성형 AI](#5-생성형-ai-활용) 참고 |
| **서드파티**       | AI 판정 테스트 이미지 30장 (`ai/ai-server/tests/`)                        | Unsplash. 아래 [2절](#2-ai-판정-테스트-이미지) 참고 |
| **팀 자체 촬영**   | 위 중 `real_flower_04.jpg` 1장                                            | iPhone 14, 2026-07-31 (EXIF 확인)           |
| **서드파티**       | 폰트 3종, 오픈소스 라이브러리, AI 모델, 프레임워크 스캐폴딩               | 아래 각 절 참고                             |

> **SSAFY 제공 스켈레톤 코드·이미지·데이터셋·에셋은 이 저장소에 포함되어 있지 않습니다.**

---

## 2. AI 판정 테스트 이미지

**경로**: `ai/ai-server/tests/benchmark/object/`, `ai/ai-server/tests/test_images/`
**용도**: 미션 판정 모델(SigLIP2 / Gemini)의 정확도·임계값 벤치마크 및 회귀 테스트

| 분류                                                 | 장수   | 출처                                   | 라이선스                                         |
| ---------------------------------------------------- | ------ | -------------------------------------- | ------------------------------------------------ |
| `benchmark/object/pass/` (실제 꽃)                   | 8      | [Unsplash](https://unsplash.com)       | [Unsplash License](https://unsplash.com/license) |
| `benchmark/object/pass/real_flower_04.jpg`           | 1      | 팀원 직접 촬영 (iPhone 14, 2026-07-31) | 팀 자체 저작물                                   |
| `benchmark/object/fail/negative/` (다른 사물)        | 9      | [Unsplash](https://unsplash.com)       | [Unsplash License](https://unsplash.com/license) |
| `benchmark/object/fail/non_real/` (그림·인쇄물·직물) | 7      | [Unsplash](https://unsplash.com)       | [Unsplash License](https://unsplash.com/license) |
| `benchmark/object/uncertain/` (흐림·어두움·가려짐)   | 4      | [Unsplash](https://unsplash.com)       | [Unsplash License](https://unsplash.com/license) |
| `test_images/`                                       | 2      | [Unsplash](https://unsplash.com)       | [Unsplash License](https://unsplash.com/license) |
| **합계**                                             | **31** |                                        |                                                  |

### Unsplash License 요약

- 상업적·비상업적 목적으로 **무료 사용·복제·수정·배포 가능**
- 촬영자나 Unsplash에 대한 **출처 표기는 의무가 아닌 권장 사항**입니다.
  본 문서의 표기는 프로젝트 투명성을 위한 자발적 고지입니다.
- **금지 사항**: Unsplash 이미지를 모아 유사·경쟁 서비스를 구성하는 행위
  → 본 프로젝트는 이미지를 **모델 판정 테스트 용도로만** 사용하므로 해당하지 않습니다.

### 사용 범위 명시

- 이 이미지들은 **서비스 운영 화면에 노출되지 않으며**, 테스트 코드에서만 참조합니다.
- **모델 학습(training)에 사용한 데이터셋이 아닙니다.**
  SigLIP2는 사전학습된 가중치를 추론에만 사용하며, 파인튜닝을 수행하지 않았습니다.

---

## 3. 폰트

이 저장소는 아래 폰트 파일을 **번들 재배포**하고 있습니다.
경로: `frontend/assets/fonts/`, `frontend/android/app/src/main/assets/fonts/`

### 배달의민족 도현체 (BMDOHYEON.ttf)

- **저작권자**: 주식회사 우아한형제들
- **출처**: https://www.woowahan.com/fonts
- **라이선스**: 배달의민족 폰트 라이선스
- **조건 요약**
  - 개인·기업 모두 영리/비영리 목적으로 자유롭게 사용 가능 (앱 UI 포함)
  - 저작권 안내와 라이선스 전문을 포함하면 다른 소프트웨어와 번들·재배포 가능
  - 라이선스 전문 포함이 어려운 경우 **출처 표기를 권장** ← 본 문서가 이에 해당
  - **폰트 파일(otf/ttf) 자체를 유상 판매하는 것은 금지**

### 갈무리11 (Galmuri11.ttf, Galmuri11-Bold.ttf, Galmuri11-Condensed.ttf)

- **저작권자**: Minseo Lee (quiple) © 2019–2023
- **출처**: https://quiple.dev/font/galmuri · https://github.com/quiple/galmuri
- **라이선스**: [SIL Open Font License 1.1](https://openfontlicense.org)
- **조건 요약**
  - 자유로운 사용·연구·수정·재배포 가능
  - 소프트웨어와 함께 번들·임베드·재배포 가능
  - **폰트 자체를 단독으로 판매하는 것은 금지**
  - 파생 저작물에 예약된 이름(Reserved Font Name) 사용 금지

### Noto Sans KR (NotoSansKR-Regular / Medium / Bold.ttf)

- **저작권자**: Google LLC
- **출처**: https://fonts.google.com/noto/specimen/Noto+Sans+KR
- **라이선스**: [SIL Open Font License 1.1](https://openfontlicense.org)
- **조건 요약**: 갈무리11과 동일

---

## 4. AI 모델 및 외부 API

| 항목                                             | 제공처                     | 라이선스 / 이용 조건                                                                  | 용도                                     |
| ------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| **SigLIP 2** (`google/siglip2-base-patch16-224`) | Google (Hugging Face 배포) | Apache License 2.0                                                                    | 미션 인증 사진의 이미지-텍스트 매칭 판정 |
| **Google Gemini API**                            | Google                     | [Google APIs 이용약관](https://developers.google.com/terms) 및 Gemini API 약관에 따름 | SigLIP2 신뢰도가 낮은 케이스의 폴백 판정 |
| **PyTorch / Transformers**                       | Meta / Hugging Face        | BSD-3-Clause / Apache 2.0                                                             | 모델 서빙                                |

> 모델 가중치는 저장소에 포함하지 않으며, 실행 시 Hugging Face Hub에서 내려받습니다.
> 사전학습 모델을 **추론에만 사용**하며, 별도의 파인튜닝이나 학습을 수행하지 않았습니다.

---

## 5. 생성형 AI 활용

| 대상                             | 도구                  | 용도                                                     |
| -------------------------------- | --------------------- | -------------------------------------------------------- |
| 빙고 미션 아이콘 SVG 52종 (`frontend/src/features/bingo/assets/missionIcons/`) | 생성형 AI | 픽셀아트 아이콘 생성 |
| 캐릭터·아바타 에셋               | 생성형 AI             | 캐릭터 및 착용 아이템 이미지 제작                        |
| `image.png` (서비스 배너 이미지) | 생성형 AI 이미지 모델 | 프로젝트 소개용 배너 제작                                |
| 일부 소스 코드                   | Claude Code, Codex    | 페어 프로그래밍. 커밋의 `Co-Authored-By` 트레일러에 표기 |

생성형 AI로 만든 결과물은 팀이 검토·수정한 뒤 사용했으며,
코드의 경우 어떤 커밋에 AI가 관여했는지 **커밋 메시지에 그대로 남겨** 추적 가능하게 했습니다.

---

## 6. 오픈소스 라이브러리

전체 의존성 목록은 각 매니페스트 파일에 있습니다.

- `frontend/package.json`, `frontend/package-lock.json`
- `frontend/admin/package.json`
- `backend/build.gradle`
- `ai/ai-server/requirements.txt`

주요 라이브러리와 라이선스는 다음과 같습니다.

### Frontend

| 라이브러리                                | 라이선스            |
| ----------------------------------------- | ------------------- |
| React, React Native                       | MIT                 |
| React Navigation                          | MIT                 |
| TanStack Query                            | MIT                 |
| react-native-maps                         | MIT                 |
| react-native-svg                          | MIT                 |
| react-native-chart-kit                    | MIT                 |
| react-native-keychain                     | MIT                 |
| react-native-image-picker                 | MIT                 |
| react-native-dotenv                       | MIT                 |
| @react-native-firebase/\*                 | Apache 2.0          |
| @react-native-google-signin/google-signin | MIT                 |
| @react-native-seoul/kakao-login           | MIT                 |
| @react-native-vector-icons/ionicons       | MIT (Ionicons: MIT) |
| Jest, ESLint, Prettier, TypeScript        | MIT / Apache 2.0    |

### Android Native / Wear OS

| 라이브러리                                             | 라이선스                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| AndroidX, Jetpack Compose, Wear Compose                | Apache 2.0                                                                      |
| Google Play Services (Wearable Data Layer, Maps, Auth) | [Google Play Services 약관](https://developers.google.com/android/guides/terms) |
| Samsung Health SDK                                     | [Samsung Developer 약관](https://developer.samsung.com/health)                  |
| Kotlin                                                 | Apache 2.0                                                                      |

### Backend

| 라이브러리                                    | 라이선스                     |
| --------------------------------------------- | ---------------------------- |
| Spring Boot, Spring Security, Spring Data JPA | Apache 2.0                   |
| SpringDoc OpenAPI, Spring REST Docs           | Apache 2.0                   |
| Hibernate                                     | LGPL 2.1 / Apache 2.0 (듀얼) |
| Flyway                                        | Apache 2.0                   |
| MySQL Connector/J                             | GPL 2.0 + FOSS Exception     |
| Redis (Lettuce)                               | Apache 2.0                   |
| jjwt                                          | Apache 2.0                   |
| Lombok                                        | MIT                          |
| Firebase Admin SDK                            | Apache 2.0                   |
| Micrometer, Logstash Logback Encoder          | Apache 2.0                   |
| JUnit 5                                       | EPL 2.0                      |
| Testcontainers, REST Assured                  | MIT / Apache 2.0             |
| H2 Database                                   | MPL 2.0 / EPL 1.0            |

### AI Server

| 라이브러리                 | 라이선스           |
| -------------------------- | ------------------ |
| FastAPI, Uvicorn, Pydantic | MIT / BSD-3-Clause |
| PyTorch                    | BSD-3-Clause       |
| Transformers, Accelerate   | Apache 2.0         |
| google-genai               | Apache 2.0         |
| Pillow                     | MIT-CMU            |
| OpenCV (opencv-python)     | Apache 2.0         |
| pytest                     | MIT                |

### Infra / DevOps

| 도구                                    | 라이선스     |
| --------------------------------------- | ------------ |
| Docker, Docker Compose                  | Apache 2.0   |
| Nginx                                   | BSD-2-Clause |
| Jenkins                                 | MIT          |
| Prometheus, Grafana Loki, Grafana Alloy | Apache 2.0   |
| Grafana                                 | AGPL 3.0     |
| k6                                      | AGPL 3.0     |

> Grafana와 k6는 AGPL이지만, **수정 없이 운영 도구로만 사용**했으며 저장소에 소스를 포함하거나 재배포하지 않습니다.

---

## 7. 프레임워크 스캐폴딩

아래는 각 프레임워크의 **공식 프로젝트 생성 도구**가 만든 초기 파일입니다.
SSAFY가 제공한 스켈레톤 코드가 아닙니다.

| 대상                                                 | 생성 도구                                                           | 라이선스   |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| `frontend/` 초기 구조, `android/`, `ios/`            | React Native Community CLI (`npx @react-native-community/cli init`) | MIT        |
| `backend/` 초기 구조, Gradle 래퍼                    | Spring Initializr                                                   | Apache 2.0 |
| `frontend/admin/` 초기 구조, `vite.svg`, `react.svg` | Vite (`npm create vite@latest`)                                     | MIT        |

이후 모든 애플리케이션 로직·화면·도메인 코드는 팀이 직접 작성했습니다.

---

## 8. 참고 자료

구현 과정에서 참고한 공식 문서입니다. 코드를 그대로 복사한 출처는 없습니다.

- [Android — Foreground services](https://developer.android.com/develop/background-work/services/fgs)
- [Android — Sensors overview (`TYPE_STEP_COUNTER`)](https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion)
- [Android — Schedule alarms](https://developer.android.com/develop/background-work/services/alarms/schedule)
- [Wear OS — Data Layer API](https://developer.android.com/training/wearables/data/data-layer)
- [React Native — Native Modules (Android)](https://reactnative.dev/docs/native-modules-android)
- [STOMP Protocol Specification 1.2](https://stomp.github.io/stomp-specification-1.2.html)
- [Spring — WebSocket / STOMP](https://docs.spring.io/spring-framework/reference/web/websocket.html)
- [TanStack Query — Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [k6 Documentation](https://grafana.com/docs/k6/latest/)

---

## 9. 프로젝트 라이선스

이 프로젝트는 SSAFY 교육 과정에서 진행한 팀 프로젝트입니다.
소스 코드의 저작권은 팀 구성원에게 있으며, 별도의 오픈소스 라이선스로 공개하지 않았습니다.

**포함된 서드파티 리소스는 위에 명시된 각 라이선스의 조건을 따릅니다.**

---

_최종 수정: 2026-08-12_
