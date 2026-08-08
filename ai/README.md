## AI

`GO!` 서비스에서 사용자가 인증한 미션 수행 사진을 자동으로 판정하는 AI 서버입니다.
[`backend`](../backend)로부터 미션 인증 요청을 받아 사진 속 객체를 분석하고,
미션 성공 여부를 판정하여 결과를 반환합니다.

### 기술 스택

- Python, FastAPI
- SigLIP2 (이미지-객체 매칭 모델), Gemini (보조/폴백 비전 모델)

### 프로젝트 구조

`app/` 아래에 계층별로 구성되어 있습니다.

- `api`, `services` : 미션 판정 API 엔드포인트 및 서비스 로직
- `vision` : Gemini/SigLIP2 기반 이미지 판정, 이미지 전처리·품질 검사
- `rule_engine` : SigLIP2 신뢰도 기반 객체 매칭 규칙 엔진
- `verifier` : 객체 검증 서비스
- `domain`, `schemas`, `mappers` : 미션/판정 결과 도메인 모델 및 변환 로직
- `prompts` : Gemini 호출용 프롬프트 구성
- `validators` : 미션 판정 요청 유효성 검사

미션 타입에 따라 SigLIP2 규칙 엔진을 우선 적용하고, 판정이 애매한 경우 Gemini로
폴백하는 구조로 판정 정확도와 비용을 함께 관리합니다.
