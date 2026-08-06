import logging

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


logger = logging.getLogger(__name__)


class ObjectVerifierService:
    """
    OBJECT Real Object Verification

    Flow

    SigLIP2 Candidate
          ↓
    Local Verification
          ↓
    Gemini fallback(optional)
          ↓
    AIResult

    """


    # ==========================
    # Threshold
    # ==========================


    # REAL 기준
    # SigLIP prompt 변경 후 scale 기준

    REAL_MARGIN_THRESHOLD = 0.0005

    REAL_MIN_POSITIVE_SCORE = 0.0008



    # 명확한 실패 기준

    NON_REAL_MARGIN_THRESHOLD = -0.001

    NON_REAL_MAX_POSITIVE_SCORE = 0.0005



    def __init__(
        self,
        gemini_service
    ):

        self.gemini_service = gemini_service



    def verify(
        self,
        image_bytes: bytes,
        target: str,
        object_result
    ) -> AIResult:


        local_result = self._local_verify(
            object_result
        )


        logger.info(
            "[ObjectVerifier] result=%s",
            local_result
        )



        # ==========================
        # LOCAL REAL
        # ==========================

        if local_result == "REAL":


            confidence = (
                self._calculate_final_confidence(
                    object_result
                )
            )


            return AIResult(

                success=True,

                confidence=confidence,

                reason=(
                    f"{target} 객체가 실제 이미지에서 확인되었습니다."
                ),

                reason_code=ReasonCode.PASS,

                detected_objects=[
                    target
                ],

                metadata={

                    "decision_source":
                        "SIGLIP_LOCAL_VERIFIER",

                    "verification":
                        "REAL",

                    "final_confidence":
                        confidence,

                    "siglip_candidate":
                        self._candidate_metadata(
                            object_result
                        )

                }

            )



        # ==========================
        # LOCAL NON REAL
        # ==========================

        if local_result == "NON_REAL":


            confidence = (
                self._calculate_final_confidence(
                    object_result
                )
            )


            return AIResult(

                success=False,

                confidence=confidence,

                reason=(
                    f"{target} 객체가 확인되지 않았습니다."
                ),

                reason_code=ReasonCode.OBJECT_NOT_FOUND,

                detected_objects=[],


                metadata={

                    "decision_source":
                        "SIGLIP_LOCAL_VERIFIER",

                    "verification":
                        "NON_REAL",

                    "final_confidence":
                        confidence,

                    "siglip_candidate":
                        self._candidate_metadata(
                            object_result
                        )

                }

            )



        # ==========================
        # Gemini fallback
        # ==========================

        logger.info(
            "[ObjectVerifier] Gemini fallback"
        )


        return self._gemini_verify(
            image_bytes,
            target,
            object_result
        )





    def _local_verify(
        self,
        object_result
    ):


        positive = object_result.positive_score

        negative = object_result.negative_score

        margin = object_result.margin



        logger.info(
            """
[Local Verification]

positive=%.6f

negative=%.6f

margin=%.6f

""",
            positive,
            negative,
            margin
        )



        # ==========================
        # FAIL
        # ==========================

        if (

            positive <=
            self.NON_REAL_MAX_POSITIVE_SCORE

            or

            margin <=
            self.NON_REAL_MARGIN_THRESHOLD

        ):

            return "NON_REAL"




        # ==========================
        # PASS
        # ==========================

        if (

            positive >=
            self.REAL_MIN_POSITIVE_SCORE

            and

            margin >=
            self.REAL_MARGIN_THRESHOLD

            and

            positive > negative

        ):

            return "REAL"



        return "UNCERTAIN"







    def _calculate_final_confidence(
        self,
        object_result
    ):

        """
        Backend 전달용 confidence

        SigLIP raw confidence 사용 X

        positive score + margin 기반 보정

        """


        positive = object_result.positive_score

        margin = object_result.margin



        score_factor = min(
            positive / 0.0015,
            1.0
        )


        margin_factor = min(
            margin / 0.001,
            1.0
        )



        confidence = (

            0.50

            +

            (
                score_factor * 0.35
            )

            +

            (
                margin_factor * 0.15
            )

        )



        return round(

            min(
                max(
                    confidence,
                    0.0
                ),
                0.95
            ),

            3

        )







    def _candidate_metadata(
        self,
        object_result
    ):


        return {

            "confidence":
                object_result.confidence,

            "positive_score":
                object_result.positive_score,

            "negative_score":
                object_result.negative_score,

            "margin":
                object_result.margin

        }







    def _gemini_verify(
        self,
        image_bytes,
        target,
        object_result
    ):


        prompt = f"""

당신은 실제 객체 검증 AI입니다.


이전 모델(SigLIP)은 "{target}" 객체 후보를 발견했습니다.


당신의 역할은 객체 탐지가 아닙니다.

이미지 안에 해당 객체가 실제 물리적으로 존재하는지 판단하세요.



판정 대상 객체:

{target}



PASS 조건:

- 실제 카메라로 촬영된 사진
- 대상 객체가 실제 물리 객체
- 자연스러운 질감 존재
- 실제 빛과 그림자 존재
- 공간적 깊이 정보 존재



FAIL 조건:

- 그림
- 일러스트
- 만화
- 사진 인쇄물
- 화면 속 이미지
- 포스터
- 스티커
- 장난감
- 모형



중요:

- 반드시 "{target}" 객체만 판단하세요.
- 비슷하게 보이는 다른 객체를 대상 객체로 판단하지 마세요.
- 대상 객체가 명확하지 않으면 FAIL 처리하세요.
- 확신이 부족하면 confidence를 낮게 반환하세요.

- 객체가 부분적으로만 노출된 경우에도 명확한 특징으로 식별 가능하면 성공 처리합니다.
- 단순한 일부 특징(털, 발, 꼬리, 일부분 등)만 보이고 전체 객체를 확인할 수 없는 경우 추측하지 않습니다.
- 객체 종류를 명확히 판단할 수 없는 경우 success=false로 반환합니다.



반드시 JSON 형식으로만 반환하세요.


형식:

{{
    "success": true,
    "confidence": 0.95,
    "reason": "한국어 판단 이유"
}}

"""



        result = self.gemini_service.verify_mission(
            image_bytes=image_bytes,
            prompt=prompt
        )



        # Backend PASS 기준

        if result.confidence < 0.7:

            result.success = False



        if result.success:

            result.reason_code = ReasonCode.PASS

            result.detected_objects = [
                target
            ]

        else:

            result.reason_code = (
                ReasonCode.OBJECT_NOT_FOUND
            )

            result.detected_objects = []



        if result.metadata is None:

            result.metadata = {}



        result.metadata.update({

            "decision_source":
                "GEMINI_FALLBACK",

            "siglip_candidate":
                self._candidate_metadata(
                    object_result
                )

        })


        return result