from app.domain.ai_result import AIResult

from app.domain.mission_result import (
    MissionStatus,
    ReasonCode
)

from app.schemas.mission import MissionResponse


class MissionValidator:
    """
    AIResult를 최종 MissionResponse로 변환

    역할
    -----------------------
    - AI 결과를 API Response 형태로 변환
    - SUCCESS / FAIL 상태 결정


    SUCCESS:
        미션 조건 만족


    FAIL:
        아래 모든 경우 포함

        - 객체 없음
        - 속성 불일치
        - 관계 불일치
        - 이미지 품질 문제
        - 판정 모호
    """


    @staticmethod
    def validate(
        ai_result: AIResult
    ) -> MissionResponse:


        # -------------------------
        # SUCCESS
        # -------------------------

        if ai_result.success is True:

            return MissionResponse(

                status=MissionStatus.SUCCESS,

                confidence=ai_result.confidence,

                reason_code=ReasonCode.PASS,

                reason=ai_result.reason

            )


        # -------------------------
        # FAIL
        # -------------------------
        # success=False
        # -------------------------

        return MissionResponse(

            status=MissionStatus.FAIL,

            confidence=ai_result.confidence,

            reason_code=(

                ai_result.reason_code

                if ai_result.reason_code is not None

                else ReasonCode.OBJECT_UNCERTAIN

            ),

            reason=(

                ai_result.reason

                if ai_result.reason

                else "AI 판정 결과를 확인할 수 없습니다."

            )

        )


    @staticmethod
    def validate_image_quality(
        ai_result: AIResult
    ) -> MissionResponse:
        """
        ImageQualityService 결과 변환

        이미지 품질 문제도 최종 FAIL 처리
        """


        return MissionResponse(

            status=MissionStatus.FAIL,

            confidence=ai_result.confidence,

            reason_code=(

                ai_result.reason_code

                if ai_result.reason_code is not None

                else ReasonCode.OBJECT_UNCERTAIN

            ),

            reason=(

                ai_result.reason

                if ai_result.reason

                else "이미지 품질 문제로 판정할 수 없습니다."

            )

        )