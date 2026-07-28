---
name: mr-gen
description: 현재 브랜치와 origin/develop의 diff를 분석해 프로젝트 형식의 GitLab MR 제목과 본문을 생성하고 glab으로 MR을 생성하거나 업데이트한다. 사용자가 MR 생성, MR 본문 작성, MR 설명 업데이트, 변경사항 기반 MR 정리를 요청할 때 사용한다.
---

# MR 생성

현재 브랜치의 변경 내용을 분석해 프로젝트 MR 형식에 맞는 제목과 본문을 만들고 GitLab MR에 반영한다.

## 1. 사전 조건 확인

저장소 루트에서 현재 브랜치와 워킹트리를 확인한다.

```powershell
git branch --show-current
git status --short
glab --version
glab auth status
```

- `glab`이 없으면 운영체제에 맞는 설치 방법을 안내하고 설치 승인을 받은 뒤 진행한다.
- `lab.ssafy.com` 인증이 없으면 Personal Access Token의 `api` 스코프가 필요하다고 안내하고 중단한다.
- 인증 명령 예시는 `glab auth login --hostname lab.ssafy.com --token <TOKEN>`이다. 토큰 값을 읽거나 출력하지 않는다.

## 2. 브랜치와 Jira 이슈 확인

브랜치명에서 작업 유형과 Jira 이슈 키를 추출한다.

- 패턴: `{type}/S15P11A506-{번호}` 또는 `{type}/{프로젝트키}-{번호}`
- 예: `feat/S15P11A506-128` -> 작업 유형 `feat`, 이슈 키 `S15P11A506-128`
- 작업 유형은 `[FEAT]`, `[FIX]`, `[CHORE]`처럼 대문자 브래킷으로 변환한다.
- Jira URL은 `https://ssafy.atlassian.net/browse/{이슈키}`로 만든다.

Jira 도구나 커넥터가 있으면 이슈를 조회해 summary를 제목으로 사용한다.

다음 경우에는 반드시 사용자에게 MR 제목을 요청한다. 임의로 만들거나 diff에서 추측하지 않는다.

- Jira 도구를 사용할 수 없음
- 브랜치명에서 이슈 키를 파싱할 수 없음
- Jira 조회 실패 또는 권한 없음

사용자에게는 작업 유형을 제외한 제목만 요청한다. 이슈 키를 얻지 못하면 Related Issue 섹션을 생략한다.

MR 제목 형식:

```text
[{작업유형}] {Jira 이슈 제목 또는 사용자 입력 제목}
```

## 3. Diff 수집

원격 기준이 최신이어야 하면 먼저 `git fetch origin develop`을 실행한다.

```powershell
git diff origin/develop...HEAD
```

파일이 20개를 초과하거나 diff가 2,000줄을 초과하면 파일 목록과 통계부터 확인한다.

```powershell
git diff origin/develop...HEAD --name-only
git diff origin/develop...HEAD --stat
```

## 4. MR 본문 작성

코드 구현 세부사항보다 변경 의도와 기능을 중심으로 작성한다.

```markdown
## 📌 Summary

{무엇을 왜 변경했는지 1~3문장으로 요약}

## 📚 Changes

- {변경된 기능 또는 모듈}
- {변경된 기능 또는 모듈}

## 📝 Note

{리뷰어가 알아야 할 주의사항이나 정책 결정. 없으면 섹션 생략}

## 📌 Related Issue

Jira: {Jira URL}
```

Summary와 Changes는 반드시 포함한다. Note는 내용이 없으면 생략하고, Related Issue는 이슈 키를 얻지 못한 경우 생략한다.

## 5. MR 생성 또는 업데이트

현재 브랜치의 열린 MR을 확인한다.

```powershell
glab mr list --source-branch <현재-브랜치> --state opened
```

- 열린 MR이 있으면 기존 description 전체를 생성한 본문으로 업데이트한다.
- 열린 MR이 없으면 target branch를 `develop`으로 지정해 새 MR을 생성한다.
- assignee, label, milestone은 별도로 지정하지 않는다.

```powershell
glab mr update <MR번호> --description <생성한-본문>
```

```powershell
glab mr create --title <생성한-제목> --description <생성한-본문> --target-branch develop
```

완료 후 `glab mr view`로 MR URL을 확인해 사용자에게 전달한다.
