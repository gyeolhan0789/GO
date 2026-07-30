from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


class ReasonMapper:
    """
    Gemini 자연어 응답을 서비스 내부 ReasonCode로 변환

    역할
    -----------------------
    - Gemini 출력 reason 분석
    - 내부 공통 ReasonCode 매핑

    주의
    -----------------------
    - 성공/실패 판단 X
    - confidence 판단 X
    - 최종 상태 결정 X
    """

    @staticmethod
    def map(
        ai_result: AIResult,
        mission_type: str
    ) -> AIResult:

        mission_type = mission_type.upper()

        reason = (
            ai_result.reason
            .lower()
            .strip()
        )

        # ==========================
        # 성공
        # ==========================

        if ai_result.success:

            ai_result.reason_code = (
                ReasonCode.PASS
            )

            return ai_result

        # ==========================
        # 이미지 품질 문제
        # ==========================

        if any(
            keyword in reason
            for keyword in [
                "흐림",
                "흐려",
                "blur"
            ]
        ):

            ai_result.reason_code = (
                ReasonCode.BLUR_IMAGE
            )

            return ai_result

        if any(
            keyword in reason
            for keyword in [
                "어두",
                "dark"
            ]
        ):

            ai_result.reason_code = (
                ReasonCode.DARK_IMAGE
            )

            return ai_result
        

        # ==========================
        # 촬영 구도 문제
        # ==========================

        if any(
            keyword in reason
            for keyword in [
                "일부만 보",
                "가려",
                "잘린"
            ]
        ):

            ai_result.reason_code = (
                ReasonCode.PARTIAL_OBJECT
            )

            return ai_result

        if any(
            keyword in reason
            for keyword in [
                "화면 끝",
                "치우쳐",
                "구석"
            ]
        ):

            ai_result.reason_code = (
                ReasonCode.OBJECT_OFF_CENTER
            )

            return ai_result

        # ==========================
        # 실제 객체 아님
        # ==========================

        if "[non_real_object]" in reason:

            ai_result.reason_code = (
                ReasonCode.NON_REAL_OBJECT
            )

            return ai_result

        # ==========================
        # 판정 모호
        # ==========================

        if any(
            keyword in reason
            for keyword in [
                "판단하기 어렵",
                "확인하기 어렵",
                "식별하기 어렵"
            ]
        ):

            if mission_type == "OBJECT":

                ai_result.reason_code = (
                    ReasonCode.OBJECT_UNCERTAIN
                )

            elif mission_type == "ATTRIBUTE":

                ai_result.reason_code = (
                    ReasonCode.ATTRIBUTE_UNCERTAIN
                )

            elif mission_type == "RELATION":

                ai_result.reason_code = (
                    ReasonCode.RELATION_UNCERTAIN
                )

            return ai_result

        # ==========================
        # 일반 실패
        # ==========================

        if mission_type == "OBJECT":

            ai_result.reason_code = (
                ReasonCode.OBJECT_NOT_FOUND
            )

        elif mission_type == "ATTRIBUTE":

            ai_result.reason_code = (
                ReasonCode.ATTRIBUTE_MISMATCH
            )

        elif mission_type == "RELATION":

            ai_result.reason_code = (
                ReasonCode.RELATION_MISMATCH
            )

        return ai_result