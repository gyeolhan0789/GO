<div align="center">

# GO!

**걸으면 채워지는 빙고, 함께 걸으면 더 빨리 채워지는 빙고**

걸음과 미션 인증을 게임으로 바꾼 산책 모바일 앱

![GO! - 함께 걷고, 빙고로 미션을 클리어하는 즐거운 산책 습관](image.png)

[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.16-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Wear OS](https://img.shields.io/badge/Wear_OS-Compose-4285F4?logo=wearos&logoColor=white)](https://developer.android.com/training/wearables)

</div>

---

## 목차

- [서비스 소개](#서비스-소개)
- [핵심 기능](#핵심-기능)
- [시스템 아키텍처](#시스템-아키텍처)
- [기술 스택](#기술-스택)
- [팀 구성](#팀-구성)
- [실행 방법](#실행-방법)
- [프로젝트 구조](#프로젝트-구조)
- [관련 문서](#관련-문서)

---

## 서비스 소개

> **"오늘도 만 보 걸어야지"는 왜 늘 실패할까?**

걷기 앱은 많지만 대부분 **숫자만 보여줍니다.** 걸음 수 그래프가 늘어난다고 해서
내일 또 나가고 싶어지지는 않습니다. 혼자 걷는 일에는 시작할 이유도, 끝낼 보상도 없습니다.

**GO!** 는 걷기를 **빙고 게임**으로 바꿉니다.

산책을 시작하면 5×5 빙고판이 열리고, 각 칸에는 걷다가 마주칠 법한 미션이 들어 있습니다.
"횡단보도를 건너세요", "벤치를 찾아 사진을 찍으세요", "1,000보를 걸으세요".
사진을 찍으면 **AI가 사진 속 사물을 판정해** 자동으로 칸을 채우고,
걸음·거리 같은 활동 미션은 **센서 값으로 조건이 충족되는 순간 저절로** 채워집니다.

가로·세로·대각선을 완성하면 빙고. 빙고는 포인트가 되고, 포인트는 아바타 옷이 되고,
아바타는 친구들과 겨루는 랭킹에 올라갑니다. 혼자 걸을 수도 있고,
**최대 4명이 하나의 빙고판을 같이 채우거나(협동), 2명이 같은 판을 두고 겨룰 수도(대결)** 있습니다.

걷는 행위 자체는 그대로인데, 나갈 이유와 돌아올 보상이 생깁니다.

<!-- 📸 스크린샷: 산책 중 빙고판이 채워지는 GIF 또는 3~4장 연속 이미지 -->

### 프로젝트 개요

| 항목       | 내용                                            |
| ---------- | ----------------------------------------------- |
| 프로젝트명 | GO!                                             |
| 기간       | 2026.07.14 ~ 2026.08.08 (약 4주)                |
| 인원       | 6명 (Frontend 2 · Backend 3 · AI/Infra 1)       |
| 플랫폼     | Android (React Native) + Galaxy Watch (Wear OS) |
| 총 커밋    | 1,000+                                          |

---

## 핵심 기능

### 🚶 산책 세션 — 앱을 꺼도 계속 기록됩니다

- **네이티브 포그라운드 서비스**로 걸음·거리·칼로리·경로를 추적합니다.
  앱을 백그라운드로 내려도, 화면을 꺼도, 앱을 강제 종료해도 기록이 끊기지 않습니다.
- **삼성 헬스 우선 + 기기 걸음 센서 폴백** — 삼성 헬스 미설치·미동의 사용자도
  `TYPE_STEP_COUNTER` 센서 경로로 동일한 경험을 얻습니다.
- **실시간 경로 지도** — GPS 좌표를 폴리라인으로 그리고, 정지 상태에서 발생하는
  좌표 튐만 골라서 걸러냅니다.
- **일시정지 / 재개 / 자동 종료** — 최근 앱 목록에서 스와이프해 앱을 닫아도
  그때까지의 기록으로 산책을 자동 마감합니다.

### 🎯 빙고판 & 미션 인증

- **사진 미션**: 촬영한 사진을 AI 서버가 판정 → 성공 시 칸 자동 오픈
- **활동 미션**: 걸음 수·거리·활동 시간 등 지표 조건을 만족하면 산책 중 자동 완료
- **협동 모드 셀 잠금**: 여러 명이 같은 칸을 동시에 인증하지 못하도록 WebSocket으로 잠금 동기화
- **빙고판 갱신(Renewal)**: 목표를 달성하거나 7일이 지나면 새 판을 받습니다

### 👥 소셜 — 동행, 친구, 랭킹

- **산책방**: 혼자(1인) · 협동(최대 4인) · 대결(2인) 세 가지 모드
- **친구**: 검색 → 요청 → 수락, 무한 스크롤 목록, 케밥 메뉴로 삭제
- **랭킹**: 전체 / 친구 랭킹, 주간 걸음 수 막대 그래프
- **실시간 알림**: FCM 푸시 + 인앱 배너 (친구 요청, 산책방 초대, 빙고 결과)

### 🧑‍🎤 아바타 & 상점

- 빙고로 얻은 포인트로 아이템을 구매하고 캐릭터를 꾸밉니다
- 장착한 아바타는 홈·랭킹·산책방·워치까지 동일하게 반영됩니다

### ⌚ 갤럭시 워치 컴패니언

- Kotlin + Jetpack Compose for Wear OS로 구현한 **네이티브 워치 앱**
- Wear Data Layer를 통해 폰과 세션 상태를 양방향 동기화
- 워치에서 산책 시작 / 일시정지 / 종료 조작, 진행 지표와 아바타 확인

---

## 시스템 아키텍처

<!-- 📸 스크린샷: 아키텍처 다이어그램 이미지가 있다면 여기에 -->

```
┌──────────────────────┐        ┌──────────────────────┐
│   Galaxy Watch       │◀──────▶│   Android Phone      │
│   (Wear OS)          │  Data  │   (React Native)     │
│   Kotlin + Compose   │  Layer │  + Native Modules    │
└──────────────────────┘        └──────────┬───────────┘
                                           │ HTTPS / WebSocket(STOMP)
                                           ▼
                              ┌────────────────────────┐
                              │   Nginx (Docker)       │
                              │   TLS · 라우팅 · 카나리 │
                              └────────┬───────────────┘
                        ┌──────────────┴───────────────┐
                        ▼                              ▼
              ┌──────────────────┐          ┌──────────────────┐
              │  Backend Stable  │          │  Backend Canary  │
              │  Spring Boot     │  90 : 10 │  Spring Boot     │
              │  :8080           │          │  :8082           │
              └────────┬─────────┘          └────────┬─────────┘
                       └──────────┬──────────────────┘
                    ┌─────────────┼─────────────┬──────────────┐
                    ▼             ▼             ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐
              │  MySQL   │  │  Redis   │  │   FCM    │  │ AI Server  │
              │ (Flyway) │  │          │  │          │  │  FastAPI   │
              └──────────┘  └──────────┘  └──────────┘  └─────┬──────┘
                                                              │
                                                    ┌─────────┴─────────┐
                                                    ▼                   ▼
                                              ┌──────────┐      ┌─────────────┐
                                              │ SigLIP2  │      │   Gemini    │
                                              │ (로컬)    │ 폴백 │  (Vision)   │
                                              └──────────┘      └─────────────┘

    관측: Prometheus · Grafana · Loki · Alloy    /    CI·CD: Jenkins (Canary)
```

**미션 판정 흐름**

```
[앱] 사진 촬영·리사이즈 → [Backend] 미션·셀 검증 → [AI] SigLIP2 규칙 엔진 판정
                                                        │ 신뢰도 애매
                                                        ▼
                                                   Gemini 폴백 판정
                                                        │
[앱] 칸 오픈 · 빙고 판정 ◀── [Backend] 결과 저장·포인트 지급 ◀──┘
```

로컬 SigLIP2로 대부분을 처리하고 애매한 케이스만 Gemini로 넘겨,
**판정 정확도와 API 비용을 동시에 관리**하는 구조입니다.

---

## 기술 스택

### Frontend (Mobile)

| 분류          | 기술                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| 코어          | React 19.2, React Native 0.86 (Community CLI, Expo 미사용), TypeScript 5.8 |
| 상태·데이터   | TanStack Query 5                                                           |
| 네비게이션    | React Navigation 7 (native-stack, bottom-tabs)                             |
| 지도·차트     | react-native-maps, react-native-chart-kit, react-native-svg                |
| 인증          | Google Sign-In, Kakao Login, react-native-keychain (토큰 보관)             |
| 푸시          | Firebase Cloud Messaging (`@react-native-firebase/messaging`)              |
| 실시간        | WebSocket + STOMP (직접 구현)                                              |
| 네이티브 모듈 | Kotlin — 산책 포그라운드 서비스, 걸음 센서, 삼성 헬스, Wear 브리지         |
| 워치          | Kotlin + Jetpack Compose for Wear OS, Wear Data Layer                      |
| 테스트·품질   | Jest (75개 테스트 파일), ESLint, Prettier                                  |

### Backend

| 분류      | 기술                                                        |
| --------- | ----------------------------------------------------------- |
| 코어      | Java 21, Spring Boot 3.5.16, Gradle                         |
| 데이터    | MySQL 8, Spring Data JPA, Flyway (마이그레이션), Redis      |
| 인증·보안 | Spring Security, JWT (jjwt), OAuth2 (Google/Kakao)          |
| 실시간    | Spring WebSocket (STOMP)                                    |
| 문서화    | SpringDoc OpenAPI, Spring REST Docs, Bruno                  |
| 알림      | Firebase Admin SDK                                          |
| 관측      | Actuator, Micrometer + Prometheus, Logstash Logback Encoder |
| 테스트    | JUnit 5, Testcontainers (MySQL), REST Assured, H2           |

### AI

| 분류   | 기술                                                                      |
| ------ | ------------------------------------------------------------------------- |
| 서버   | Python, FastAPI, Uvicorn                                                  |
| 비전   | SigLIP2 (로컬 이미지-텍스트 매칭), Google Gemini (폴백)                   |
| 처리   | PyTorch, Transformers, Pillow, OpenCV                                     |
| 구조   | 규칙 엔진(rule_engine) · 검증기(verifier) · 프롬프트(prompts) 계층 분리   |
| 테스트 | pytest — 판정 정확도 벤치마크, SigLIP2 임계값 튜닝, Gemini 폴백 지연 측정 |

### Infra / DevOps

| 분류        | 기술                                                                                   |
| ----------- | -------------------------------------------------------------------------------------- |
| CI/CD       | Jenkins (dev / prod / admin 파이프라인)                                                |
| 배포        | Docker, Docker Compose, **Nginx 기반 카나리 배포 (90:10 → Canary-only → Stable 승격)** |
| 관측        | Prometheus, Grafana, Loki, Grafana Alloy                                               |
| 부하 테스트 | k6 (load / stress / spike + 엔드포인트 단위 30여 종)                                   |

---

## 팀 구성

| 이름   | 역할                     | 주요 담당                                                                                               |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| 이영주 | **Frontend**             | 산책 세션(네이티브 포그라운드 서비스·GPS·걸음 센서), 빙고판·미션 인증, 친구/동행, 알림(FCM), 홈·랭킹 UI |
| 황덕   | **Frontend**             | WebSocket/STOMP 실시간 레이어, 걸음 원장·히스토리, 아바타·상점, 워치 연동, 일부 백엔드                  |
| 조성혁 | **Backend**              | 도메인 API 전반, API 문서화, k6 부하 테스트, 관리자 기능, 인프라                                        |
| 한결   | **Backend / AI / Infra** | 백엔드 도메인, AI 서버, Nginx·배포 스크립트, 모니터링                                                   |
| 문상휘 | **Backend**              | 도메인 로직, k6 부하 테스트, 인프라                                                                     |
| 김민서 | **AI**                   | 미션 판정 모델, 규칙 엔진                                                                               |

---

## 실행 방법

### 사전 준비

- Node.js `24.18.0` (`.nvmrc`, nvm 사용 시 `nvm use`)
- JDK 21
- Android Studio + Android SDK (에뮬레이터 또는 실기기)
- Docker / Docker Compose
- Python 3.10+ (AI 서버)

### 1. Backend

```bash
cd backend
docker compose -f docker-compose.local.yml up -d   # MySQL + Redis
./gradlew bootRun
```

API 문서: `http://localhost:8080/swagger-ui/index.html`

### 2. AI Server

```bash
cd ai/ai-server
pip install -r requirements.txt
echo "GEMINI_API_KEY=..." > .env     # Gemini 폴백용 키
uvicorn app.main:app --reload --port 8000

pytest                               # 판정 정확도·지연 벤치마크 포함
```

### 3. Frontend

```bash
cd frontend
nvm use
npm install
cp .env.example .env        # API_BASE_URL 설정
npm start                   # Metro 번들러

# 다른 터미널에서
npm run android             # 또는 android:local / android:dev / android:prod
npm run android:reverse     # 실기기에서 로컬 백엔드에 붙을 때
```

### 4. Galaxy Watch (선택)

```bash
cd frontend
npm run wear:install
```

> ⚠️ 폰 앱(`:app`)과 워치 앱(`:wear`)은 Data Layer 통신 때문에 `applicationId`가
> 둘 다 `com.wecandoit`입니다. 대상을 지정하지 않고 설치하면 **반대쪽 앱이 덮여
> 사라집니다.** `npm run android:*` / `wear:install` 스크립트가 연결된 기기 중
> 폰·워치를 자동 판별해 한 대에만 설치하며, 판별에 실패하면 설치하지 않고 멈춥니다.
> 같은 종류가 여러 대 붙어 있으면 `-- --serial <시리얼>`로 직접 지정하세요.

### 5. 부하 테스트 (선택)

```bash
cd load-test
./run.sh                    # 대화형: 환경 선택 → 시나리오 실행 → 결과 요약 → cleanup
```

---

## 프로젝트 구조

```
.
├── frontend/                 # React Native 앱 (Android + Wear OS)
│   ├── src/
│   │   ├── app/              # 네비게이션, 전역 Provider
│   │   ├── screens/          # 라우트 단위 화면 (21개)
│   │   ├── features/         # 도메인 모듈 (auth, bingo, walk-session, room,
│   │   │                     #   friend, ranking, notification, shop, member,
│   │   │                     #   history, wear)
│   │   └── shared/           # api 클라이언트, 공통 컴포넌트·훅·유틸·타입
│   ├── android/
│   │   ├── app/              # 폰 앱 + 네이티브 모듈 (Kotlin)
│   │   │   └── src/main/java/com/wecandoit/
│   │   │       ├── walktracking/   # 산책 포그라운드 서비스
│   │   │       ├── stepsensor/     # 기기 걸음 센서 + 자정 경계 저장
│   │   │       ├── samsunghealth/  # 삼성 헬스 연동
│   │   │       └── wearbridge/     # 폰↔워치 Data Layer 브리지
│   │   ├── wear/             # 갤럭시 워치 앱 (Compose for Wear OS)
│   │   └── wear-protocol/    # 폰·워치 공용 통신 규약 모듈
│   ├── __tests__/            # Jest 테스트 (75개)
│   └── admin/                # 관리자 웹
│
├── backend/                  # Spring Boot API 서버
│   ├── src/main/java/com/wecandoit/
│   │   ├── auth/ member/ avatar/ item/       # 인증·회원·아바타·아이템
│   │   ├── bingo/ game/ mission/             # 빙고·게임방·미션
│   │   ├── friend/ ranking/ notification/    # 소셜
│   │   ├── point/ history/ admin/            # 포인트·이력·관리자
│   │   └── common/                           # 설정, 예외, JWT, 보안, WebSocket
│   ├── docs/convention/      # Java·Spring·JPA·Flyway·Git·테스트 컨벤션
│   ├── docs/manual/          # 카나리 배포, WebSocket 흐름, EC2/Jenkins 운영
│   └── Jenkinsfile.{dev,prod,admin}
│
├── ai/ai-server/             # FastAPI 미션 판정 서버
│   └── app/
│       ├── api/ services/    # 판정 엔드포인트·서비스
│       ├── services/vision/       # Gemini · SigLIP2 판정, 전처리·품질 검사
│       ├── services/rule_engine/  # SigLIP2 신뢰도 기반 규칙 엔진
│       ├── services/verifier/     # 객체 검증
│       └── prompts/ validators/   # 프롬프트 구성 · 요청 검증
│
├── infra/
│   ├── nginx/                # 설정, 업스트림(stable / canary-10 / canary-only), 전환 스크립트
│   ├── deploy/               # 헬스체크·라우팅 전환·Flyway 이력 검사 스크립트
│   ├── monitoring/           # Prometheus, Grafana, Loki, Alloy
│   └── jenkins/
│
├── load-test/                # k6 부하 테스트
└── api-document/             # Bruno API 컬렉션
```

---

## 관련 문서

| 문서 | 설명 |
| --- | --- |
| [CREDITS.md](CREDITS.md) | **서드파티 리소스 출처 및 라이선스 고지** |
| [frontend/README.md](frontend/README.md) | 프론트엔드 개발 가이드 |
| [backend/README.md](backend/README.md) | 백엔드 개발 가이드 |
| [ai/README.md](ai/README.md) | AI 서버 가이드 |
| [load-test/README.md](load-test/README.md) | k6 부하 테스트 가이드 |
| [backend/docs/convention/](backend/docs/convention/) | 코드·Git·테스트 컨벤션 |
| [backend/docs/manual/canary-deployment.md](backend/docs/manual/canary-deployment.md) | 카나리 배포 운영 가이드 |

---

## 라이선스 및 출처

이 프로젝트에 포함된 폰트·오픈소스 라이브러리·AI 모델의 출처와 라이선스는
[CREDITS.md](CREDITS.md)에 명시되어 있습니다.

SSAFY에서 제공한 스켈레톤 코드·이미지·데이터셋·에셋은 포함되어 있지 않습니다.
