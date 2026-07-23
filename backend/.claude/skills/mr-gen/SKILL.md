---
name: mr-gen
description: 현재 브랜치와 develop의 diff를 분석해 GitLab MR 바디를 생성하고 glab으로 업데이트한다
argument-hint: "[선택] 대상 브랜치명 (기본값: 현재 브랜치)"
---

# MR 바디 자동 생성

현재 브랜치의 변경 내용을 분석해 프로젝트 MR 템플릿 형식에 맞는 바디를 생성하고, GitLab MR에 직접 적용한다.

## 사전 조건 확인

### glab 설치 확인 및 자동 설치

```bash
which glab
```

설치되어 있지 않으면 자동으로 설치한다:

```bash
brew install glab --quiet
```

설치 후 인증 상태를 확인한다:

```bash
glab auth status 2>&1
```

인증이 되어 있지 않으면 중단하고 다음을 안내한다:

```
glab 인증이 필요합니다. lab.ssafy.com은 OAuth 웹 로그인을 지원하지 않으므로
Personal Access Token 방식을 사용해야 합니다.

1. 브라우저에서 아래 URL 접속:
   lab.ssafy.com/-/user_settings/personal_access_tokens
2. 토큰 이름 입력 후 'api' 스코프 체크 → Create personal access token
3. 생성된 토큰을 복사한 뒤 터미널에서 실행:
   glab auth login --hostname lab.ssafy.com --token <복사한_토큰>

완료 후 스킬을 다시 시작하세요.
```

## 실행 단계

### 1. 브랜치 및 Jira 이슈 확인

```bash
git branch --show-current
```

브랜치명에서 작업 유형과 Jira 이슈 번호를 추출한다.

- 패턴: `{type}/S15P11A506-{번호}` 또는 `{type}/{프로젝트키}-{번호}`
- 예: `feat/S15P11A506-128` → 작업 유형 `feat`, 이슈 키 `S15P11A506-128`
- 작업 유형을 대문자 브래킷으로 변환: `feat` → `[FEAT]`, `fix` → `[FIX]`, `chore` → `[CHORE]` 등
- 작업 유형은 반드시 브랜치명에서만 추출한다. 패턴이 맞지 않으면 브래킷 없이 제목만 사용한다.
- Jira URL: `https://ssafy.atlassian.net/browse/{이슈키}`

현재 브랜치의 열린 MR을 먼저 확인한다:

```bash
glab mr list --source-branch "$(git branch --show-current)" --state opened
```

MR이 존재하면 기존 description만 갱신하므로 제목 조회와 제목 입력을 건너뛴다.

MR이 없는 경우에만 이슈 키를 파싱했으면 Jira MCP로 이슈 제목을 가져온다:

```
mcp__jira__jira_get_issue(issue_key="{이슈키}")
→ summary 필드 추출
```

MR 제목 형식: `[{작업유형}] {지라 이슈 제목}`
예: `[FEAT] 친구 검색 및 요청`

다음 중 하나라도 해당하면 **반드시 `AskUserQuestion` 도구로 제목을 입력받는다** (자동 생성·임의 결정·diff 유추 전부 금지):

- Jira MCP를 사용할 수 없는 경우
- 이슈 번호를 파싱할 수 없는 경우
- Jira 호출이 오류를 반환한 경우 (이슈 없음, 권한 없음 등)

```
AskUserQuestion(
  question="MR 제목을 입력해 주세요 (작업유형 제외, 예: '친구 검색 및 요청')",
  header="MR 제목",
  options=[{ label: "직접 입력", description: "Other 필드에 제목을 입력해 주세요." }],
  multiSelect=false
)
```

사용자가 입력한 제목을 그대로 사용한다. 이슈 번호를 파싱할 수 없거나 Jira 호출이 실패한 경우 Related Issue 섹션은 생략한다.

### 2. Diff 수집

```bash
git diff origin/develop...HEAD
```

diff가 너무 크면(파일 수 20개 초과 또는 라인 수 2000줄 초과) 파일 목록만 먼저 확인한다:

```bash
git diff origin/develop...HEAD --name-only
```

### 3. MR 바디 생성

diff를 분석해 아래 형식으로 MR 바디를 작성한다. **코드 수준이 아닌 의도(기능) 수준**으로 서술한다.

```
## 📌 Summary

{변경의 목적과 핵심 내용을 1–3문장으로 요약. "무엇을 왜 했는가"를 중심으로.}

## 📚 Changes

- {변경된 기능 영역 또는 모듈 1}
- {변경된 기능 영역 또는 모듈 2}
- ...

## 📝 Note

{배포 주의사항, 검토자 참고사항, 특이한 구현 결정 등 리뷰어가 알아야 할 내용.
해당 사항이 없으면 이 섹션 전체를 생략한다.}

## 📌 Related Issue

Jira: {Jira URL}
```

**섹션 작성 기준:**

| 섹션 | 내용 | 비어도 되는가 |
|------|------|--------------|
| Summary | 변경 의도 요약 | 아니오 |
| Changes | 변경 영역 불릿 목록 | 아니오 |
| Note | 리뷰어 참고사항 (LLM 판단) | 예 — 없으면 섹션 생략 |
| Related Issue | Jira URL | 파싱 실패 시 생략 가능 |

### 4. MR 업데이트 또는 생성

**MR이 존재하는 경우** — 기존 description을 전체 덮어쓴다:

```bash
glab mr update {MR번호} --description "{생성된 바디}"
```

**MR이 없는 경우** — 새 MR을 생성한다:

```bash
glab mr create \
  --title "[{작업유형}] {지라 이슈 제목}" \
  --description "{생성된 바디}" \
  --target-branch develop
```

### 5. 완료 확인

업데이트된 MR URL을 출력한다:

```bash
glab mr view --web
```

또는 URL만 출력:

```bash
glab mr view | grep "^Web URL"
```

## 주의사항

- `origin/develop`이 최신인지 확인이 필요하면 `git fetch origin develop` 먼저 실행한다.
- diff가 매우 클 경우 파일 목록을 기준으로 기능 영역을 추론해도 된다.
- MR 생성 시 assignee, label, milestone은 별도로 지정하지 않는다 (GitLab 기본값 사용).
