---
name: refactor-convention
description: 백엔드 기본·테스트 컨벤션을 읽고 Java 코드를 컨벤션에 맞게 점검하고 리팩터링한다. 사용자가 백엔드 컨벤션 검사, 변경 파일 정리, Java 리팩터링을 요청할 때 사용하며, 요청에 diff가 있으면 현재 브랜치 변경 파일만 대상으로 한다.
---

# 백엔드 컨벤션 리팩터링

## 1. 컨벤션 로드

작업 전에 저장소 루트 기준으로 다음 문서를 모두 읽는다.

- `backend/convention/back-basic-convention.md`
- `backend/convention/back-test-convention.md`

이 문서만 리팩터링 기준으로 사용한다. 문서에 없는 규칙을 임의로 적용하지 않는다.

## 2. 대상 파일 결정

사용자 요청에 `diff`가 있으면 현재 브랜치에서 `origin/develop` 대비 변경된 Java 파일만 대상으로 한다.

```powershell
git diff --name-only (git merge-base HEAD origin/develop) -- "*.java"
```

`diff`가 없으면 `backend/src/main/java` 아래의 모든 Java 파일을 대상으로 한다.

```powershell
rg --files backend/src/main/java -g "*.java"
```

대상 목록에 테스트 파일이 포함되면 테스트 컨벤션도 적용한다.

## 3. 점검 및 수정

컨벤션을 기준으로 각 파일을 확인한다.

- 네이밍, import, Lombok, JPA 어노테이션, 코드 스타일처럼 범위가 명확한 항목은 수정한다.
- 레이어드 아키텍처 위반이나 Controller 비즈니스 로직처럼 구조적 판단이 필요한 항목은 사용자 요청 범위를 넘지 않는 경우에만 수정한다.
- 구조적 수정이 요청 범위를 벗어나면 변경하지 않고 파일과 위치, 위반 내용을 기록한다.
- 관련 없는 코드와 사용자 변경은 건드리지 않는다.

## 4. 검증

수정 후 `backend`에서 프로젝트 테스트를 실행한다.

```powershell
.\gradlew.bat test
```

실패하면 이번 변경으로 발생한 문제인지 확인해 수정한다. 기존 실패라면 실패한 테스트와 원인을 보고한다.

## 5. 결과 보고

다음 형식으로 간단히 정리한다.

```markdown
## 리팩터링 결과

### 자동 수정 완료
✅ [컨벤션 항목] - N건 수정
❌ [컨벤션 항목] - [파일명]:[라인] (수정 실패 이유)

### 위반 리포트
❌ [컨벤션 항목] - [파일명]:[라인] (위반 내용)
✅ [컨벤션 항목] - 이상 없음
```

수정한 파일과 테스트 결과도 함께 보고한다.
