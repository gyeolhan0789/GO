---
name: bruno-sync
description: backend/ai 디렉터리의 컨트롤러·라우터를 스캔해 api-document/ Bruno 컬렉션과 비교하고, 문서가 없는 엔드포인트만 새로 생성한다. 인자 없으면 backend+ai 전체, "backend" 또는 "ai" 인자 시 해당 영역만 대상.
argument-hint: "[backend|ai]"
---

## Bruno docs language

Bruno `.bru` 파일의 `docs {}` 블록은 가능한 한 한국어로 작성한다. API 필드명, enum 값, URL, 코드 예시처럼 계약상 영문 표기가 필요한 경우만 원문을 유지한다.

# Bruno API 명세 동기화

`backend/`와 `ai/`의 실제 엔드포인트를 스캔해 `api-document/`의 기존 Bruno 문서와 비교하고, 문서가 없는 엔드포인트만 새로 만든다. **이미 존재하는 `.bru` 파일은 절대 덮어쓰지 않는다** — 내용이 코드와 달라 보이면 드리프트로 리포트만 한다.

## 0단계: 대상 범위 결정

인자를 확인한다.

- 인자 없음 → `backend`와 `ai` 모두 대상
- 인자가 `backend` → Spring 백엔드 컨트롤러만 대상
- 인자가 `ai` → FastAPI 라우터만 대상

## 1단계: 실제 엔드포인트 인벤토리 추출

**반드시 `origin/develop` 기준으로 스캔한다.** 현재 체크아웃된 브랜치(작업 중인 feature/docs 브랜치 등)의 WIP 코드를 기준으로 삼지 않는다. 먼저 `git fetch origin develop`으로 최신 상태를 받는다. 워킹 디렉터리나 현재 브랜치를 건드리지 않도록 `git checkout`은 사용하지 않고, 아래처럼 비파괴적으로 읽는다.

- 파일 목록: `git ls-tree -r --name-only origin/develop -- backend/src/main/java ai`
- 파일 내용: `git show origin/develop:<파일경로>`

### backend (Spring)

`origin/develop` 기준 `backend/src/main/java/com/wecandoit/**/controller/*.java`에서 `@RestController` 클래스를 모두 찾는다. 각 클래스의 `@RequestMapping`(클래스 레벨 prefix)과 `@GetMapping`/`@PostMapping`/`@PatchMapping`/`@PutMapping`/`@DeleteMapping`(메서드 레벨)을 조합해 `HTTP 메서드 + 전체 경로`를 추출한다. 경로 변수(`{roomId}` 등)는 그대로 유지한다.

### ai (FastAPI)

`origin/develop` 기준 `ai/*/app` 아래 각 FastAPI 앱(`app/main.py`가 있는 디렉터리)에서 `include_router`로 등록된 라우터 파일들을 찾는다(예: `ai/ai-server/app/api/mission.py`). 각 라우터의 `prefix`와 `@router.get`/`@router.post`/... 데코레이터를 조합해 `HTTP 메서드 + 전체 경로`를 추출한다.

## 2단계: 기존 Bruno 문서 스캔

`api-document/backend/**/*.bru`와 `api-document/ai/**/*.bru`(둘 다 `environments/`는 제외)를 모두 읽어, 각 파일의 `meta` 블록과 HTTP 메서드 블록(`get`/`post`/`patch`/`put`/`delete`)에서 `url:` 값을 추출한다. `url:`에서 `{{backendBaseUrl}}`, `{{aiBaseUrl}}`, `{{<appName>BaseUrl}}` 같은 환경변수 prefix를 제거하고, 쿼리스트링과 실제 숫자로 채워진 경로 변수(`/rooms/1` 등)를 경로 템플릿(`/rooms/{roomId}`)으로 정규화한다.

## 3단계: 매칭

1단계에서 추출한 실제 엔드포인트와 2단계에서 정규화한 기존 문서를 `HTTP 메서드 + 경로 템플릿` 기준으로 매칭한다.

- 매칭되는 `.bru`가 있으면 → "기존 문서 있음"으로 분류, 5단계로
- 매칭되는 `.bru`가 없으면 → "신규 엔드포인트"로 분류, 4단계로

## 4단계: 신규 엔드포인트 문서 생성

신규로 분류된 각 엔드포인트에 대해, 아래 규칙을 반드시 지켜 `.bru` 파일을 새로 만든다. 이 세션에서 이미 작성된 `api-document/backend/**`, `api-document/ai/**` 파일들을 실제 예시/기준으로 참고한다.

- **폴더 위치**: Spring 엔드포인트는 `api-document/backend/{도메인}/` (도메인은 기존 폴더 그룹핑을 따른다. 예: `auth`, `member`, `game/room`). FastAPI 엔드포인트는 `api-document/ai/{앱 이름}/` (앱 이름은 라우터의 `prefix`/`tags`를 우선 기준으로 하고, 디렉터리 이름과 다르면 라우터 쪽을 따른다 — 예: `ai/ai-server`의 `/mission` prefix → `api-document/ai/mission/`).
- **`meta.name`**: 반드시 한글 API 제목.
- **`docs{}` 블록**: 1줄 설명 → 성공 응답 예시(JSON) → 에러 케이스. 에러 케이스는 절대 표(markdown table)로 쓰지 않고, `**상황 설명**` 볼드 제목 다음에 ```json``` 코드 블록으로 실제 에러 응답 하나씩 기재한다.
- **에러 케이스 범위**: 해당 엔드포인트가 실제로 던질 수 있는 에러만 코드를 추적해서 기재한다(서비스 로직, PromptBuilder 등 실제 `throw`/`raise` 지점까지 확인). 프레임워크의 전체 에러 코드 목록을 무차별로 나열하지 않는다.
- **에러 응답 형태 구분**: 백엔드는 `CustomExceptionHandler`/`ErrorCode` 기반의 `{"status": <int>, "message": "<string>"}`. FastAPI는 `HTTPException`의 `{"detail": "<string>"}` 또는 FastAPI 자체 검증 실패 시의 배열 형태(`{"detail": [{"loc": [...], "msg": ..., "type": ...}]}`). 두 형태를 절대 서로 맞춰서 왜곡하지 않고, 실제 프레임워크가 반환하는 그대로 기재한다.
- **baseUrl 변수**: Spring 엔드포인트는 `{{backendBaseUrl}}` 재사용. FastAPI는 이미 등록된 앱이면 그 앱의 `{appName}BaseUrl`을 재사용하고, 새 FastAPI 앱을 처음 발견한 경우에는 `environments/local.bru`와 `environments/dev.bru`에 새 `{appName}BaseUrl` 변수를 추가한다(로컬 기본값은 실행 포트를 저장소에서 확인할 수 있으면 그 값을, 없으면 uvicorn 기본값인 8000을 가정하고 그 사실을 `docs{}`에 명시).
- **`meta.type`/`seq`**: `type`은 항상 `http`. `seq`는 같은 폴더 안에서 기존 파일들의 최대 `seq` 값 다음 정수로 이어서 부여한다(새 폴더면 1부터).
- **`auth`/`headers` 블록**: 인증이 필요한 엔드포인트(Spring: `@LoginMemberId` 등 인증 파라미터가 있는 경우, FastAPI: 인증 의존성이 있는 경우)는 `auth: inherit`으로 쓰고 `headers { Authorization: Bearer {{accessToken}} }` 블록을 추가한다. 인증이 필요 없는 공개 엔드포인트는 `auth: none`으로 쓰고 `headers` 블록 자체를 생략한다.
- **`body` 블록 선택**: 요청 바디가 없으면(`GET`, 바디 없는 `DELETE`/`PATCH`/`POST` 등) `body: none`. JSON 바디(Spring의 `@RequestBody`)면 `body: json`과 `body:json { ... }` 블록을 쓴다. 파일 업로드/폼 데이터(FastAPI의 `File`/`Form`, Spring의 멀티파트)면 `body: multipartForm`과 `body:multipart-form { ... }` 블록을 쓴다.
- **경로 변수 표기**: 경로 변수는 별도 `params:path` 블록을 쓰지 않고, URL에 예시 값을 직접 채워 넣는다(예: `/rooms/{roomId}` → `/rooms/1`).
- **쿼리 파라미터 표기**: 쿼리 파라미터가 있으면 URL에도 예시 값을 포함하고(`?keyword=nick`), 동일한 키/값을 `params:query { keyword: nick }` 블록으로도 명시한다.

## 5단계: 기존 문서 드리프트 리포트

기존 `.bru`가 있는 엔드포인트는 파일을 수정하지 않는다. 대신 실제 코드(요청 필드/검증 규칙, 응답 필드, 에러 코드)와 `docs{}` 내용을 비교해 다음과 같은 차이를 찾으면 리포트에 기록한다.

- 코드에는 있지만 문서에 없는 요청/응답 필드
- 코드에서 새로 발생 가능한 에러 케이스인데 문서에 없는 것
- 문서에는 있지만 코드에서 더 이상 존재하지 않는 필드/에러 케이스
- 경로, HTTP 메서드가 문서와 다르게 변경된 경우

## 6단계: 결과 출력

아래 형식으로 요약한다.

```
## Bruno 문서 동기화 결과

### 신규 생성
- api-document/{경로}/{파일}.bru — {메서드} {경로}

### 드리프트 리포트 (수동 확인 필요)
- api-document/{경로}/{파일}.bru — {구체적인 차이 설명}

### 변경 없음
- N개 엔드포인트는 이미 최신 상태로 보입니다.
```

기존 `.bru` 파일은 어떤 경우에도 이 스킬이 직접 수정하지 않는다. 드리프트가 발견되면 사용자에게 보고만 하고, 실제 반영 여부는 사용자의 후속 지시를 따른다.
