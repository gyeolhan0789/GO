from app.domain.ai_result import (
    AIResult,
    DetectedObject
)

from app.domain.model_info import ModelType



class SigLIPResultMapper:
    """
    SigLIP2 결과를 AIResult DTO로 변환

    역할
    -----------------------
    - SigLIP similarity 결과 변환
    - 공통 AIResult 생성
    - 모델 추적 정보 저장

    책임 제외
    -----------------------
    - 성공/실패 판단
    - confidence threshold 판단
    - ReasonCode 결정

    판정 책임은 RuleEngine 담당
    """


    MODEL_NAME = (
        "google/siglip2-base-patch16-224"
    )



    def _normalize_label(
        self,
        label: str
    ) -> str:
        """
        SigLIP candidate label 정제

        예:
        a photo of a flower
        ->
        flower

        not a flower
        ->
        not flower
        """

        if label.startswith(
            "a photo of a "
        ):

            return label.replace(
                "a photo of a ",
                ""
            )


        if label.startswith(
            "not a "
        ):

            return label.replace(
                "not a ",
                "not "
            )


        return label



    def map(
        self,
        siglip_result: dict
    ) -> AIResult:


        top_label = siglip_result.get(
            "top_label",
            ""
        )


        confidence = siglip_result.get(
            "confidence",
            0.0
        )


        scores = siglip_result.get(
            "scores",
            {}
        )


        latency_ms = siglip_result.get(
            "latency_ms",
            0.0
        )


        normalized_label = (
            self._normalize_label(
                top_label
            )
        )



        return AIResult(

            # ======================
            # Model Tracking
            # ======================

            model_name=(
                self.MODEL_NAME
            ),

            model_type=(
                ModelType.VISION
            ),

            latency_ms=float(
                latency_ms
            ),



            # ======================
            # AI Result
            # ======================

            confidence=float(
                confidence
            ),


            reason=(
                "SigLIP2 object matching completed"
            ),



            detected_objects=[

                DetectedObject(

                    name=normalized_label,

                    confidence=float(
                        confidence
                    )

                )

            ],



            metadata={

                # 원본 추적용
                "top_label": top_label,

                # 화면/판정용
                "normalized_label": normalized_label,

                "similarity_scores": scores

            }

        )