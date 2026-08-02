from app.domain.ai_result import (
    AIResult,
    DetectedObject
)


class SigLIPResultMapper:
    """
    SigLIP2 결과를 AIResult DTO로 변환

    역할
    -----------------------
    - SigLIP similarity 결과 변환
    - 공통 AIResult 생성
    - 모델 metadata 저장

    책임 제외
    -----------------------
    - 성공/실패 판단
    - confidence threshold 판단
    - ReasonCode 결정
    """


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


        return AIResult(

            confidence=float(
                confidence
            ),


            reason=(
                f"SigLIP2 matched label: "
                f"{top_label}"
            ),


            detected_objects=[
                DetectedObject(
                    name=top_label,
                    confidence=float(
                        confidence
                    )
                )
            ],


            metadata={

                "model": (
                    "siglip2-base-patch16-224"
                ),

                "top_label": top_label,

                "similarity_scores": scores

            }
        )