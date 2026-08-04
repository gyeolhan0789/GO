---
name: refactor-convention
description: 백엔드 컨벤션 문서를 참고해 코드를 리팩터링한다. 인자 없으면 전체 파일, "diff" 인자 시 현재 브랜치 변경 파일 대상.
argument-hint: "[diff]"
---

# 백엔드 컨벤션 리팩터링

## 0단계: 컨벤션 문서 로드

작업 전 아래 두 파일을 반드시 읽는다.

- `docs/convention/java-convention.md`
- `docs/convention/spring-boot-convention.md`
- `docs/convention/back-test-convention.md`

이 문서가 리팩터링의 유일한 기준이다. 문서에 없는 규칙은 적용하지 않는다.

## 1단계: 대상 파일 결정

인자를 확인한다.

- 인자 없음 → `src/main/java` 하위 모든 `.java` 파일 대상
- 인자가 `diff` → `git diff --name-only $(git merge-base HEAD origin/develop)` 로 현재 브랜치에서 변경된 `.java` 파일 목록 추출

## 2단계: 컨벤션 점검 및 수정

로드한 컨벤션 문서를 기준으로 각 파일을 점검한다.

- **자동 수정 가능한 항목**(네이밍, import, Lombok, JPA 어노테이션, 코드 스타일 등)은 즉시 수정한다.
- **자동 수정 불가한 항목**(레이어드 아키텍처 위반, Controller 비즈니스 로직 등 구조적 문제)은 수정하지 않고 위반 내용을 기록한다.

## 3단계: 결과 출력

모든 파일 처리 후 컨벤션 항목별 체크리스트를 출력한다.

```
## 리팩터링 결과

### 자동 수정 완료
✅ [컨벤션 항목] — N건 수정
❌ [컨벤션 항목] — [파일명]:[라인] (수정 실패 이유)

### 위반 리포트 (수동 수정 필요)
❌ [컨벤션 항목] — [파일명]:[라인] ([위반 내용 한 줄 설명])
✅ [컨벤션 항목] — 이상 없음
```

수정된 파일이 있으면 파일별 변경 내용을 간략히 요약한다.
