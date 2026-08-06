## 기대 - backend

`기대` 서비스의 핵심 API 서버입니다. 회원/인증, 빙고 게임 진행, 미션·아바타·아이템·포인트
관리, 친구·랭킹·알림 등 사용자와 관련된 모든 도메인 로직을 처리하며,
미션 인증 사진 판정은 별도의 [`ai`](../ai) 서비스와 연동하여 처리합니다.

### 기술 스택

- Java 21, Spring Boot 3.5.16
- Gradle (단일 모듈)

### 프로젝트 구조

`src/main/java/com/wecandoit/` 아래에 도메인별 패키지로 구성되어 있습니다.

- `admin` : 아바타/아이템/미션 관리자 기능
- `auth` : 로그인/인증 (OAuth 포함)
- `avatar`, `item`, `member` : 아바타·아이템·회원 도메인
- `bingo`, `game` : 빙고 게임 진행 및 게임방/결과 관리
- `mission` : 미션 도메인 (판정은 `ai` 서비스가 수행)
- `friend`, `ranking`, `notification`, `point`, `history` : 친구, 랭킹, 알림, 포인트, 활동 이력
- `common` : 설정, 공통 엔티티, 예외 처리, JWT, 보안, 응답 포맷, 웹소켓 등 공통 인프라

컨벤션 및 상세 문서는 [`docs/convention`](docs/convention)을 참고하세요.
