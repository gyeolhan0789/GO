from app.domain.ai_result import AIResult

from app.services.vision.object_vision_service import (
    ObjectVisionService
)

from app.services.vision.gemini_service import (
    GeminiService
)

from app.prompts.prompt_builder import (
    PromptBuilder
)

from app.mappers.reason_mapper import (
    ReasonMapper
)


class VisionRouter:
    """
    Mission Type 기반 Vision Model Routing

    역할
    -----------------------
    - Mission Type에 따른 Vision Model 선택
    - 적절한 Vision Pipeline 호출
    - AIResult 반환

    Routing
    -----------------------
    OBJECT
        -> SigLIP2 Pipeline

    ATTRIBUTE
        -> Gemini Vision

    RELATION
        -> Gemini Vision


    책임 제외
    -----------------------
    - 이미지 품질 검사
    - Rule 판단
    - API Response 변환
    """


    def __init__(self):

        self.object_service = (
            ObjectVisionService()
        )

        self.gemini_service = (
            GeminiService()
        )



    def verify(
        self,
        image_bytes: bytes,
        mission_type: str,
        decision_condition: dict
    ) -> AIResult:
        """
        Mission Type 기반 Vision Routing

        Args:
            image_bytes:
                업로드 이미지 bytes

            mission_type:
                OBJECT / ATTRIBUTE / RELATION

            decision_condition:
                미션 조건

        Returns:
            AIResult
        """


        mission_type = (
            mission_type.upper()
        )



        # ==========================
        # OBJECT
        # ==========================

        if mission_type == "OBJECT":

            return self.object_service.verify(
                image_bytes=image_bytes,
                decision_condition=decision_condition
            )



        # ==========================
        # ATTRIBUTE
        # RELATION
        # ==========================

        if mission_type in (
            "ATTRIBUTE",
            "RELATION"
        ):

            prompt = (
                PromptBuilder.build(
                    mission_type=mission_type,
                    decision_condition=decision_condition
                )
            )


            ai_result = (
                self.gemini_service.verify_mission(
                    image_bytes=image_bytes,
                    prompt=prompt
                )
            )


            # Gemini 자연어 결과 -> ReasonCode 변환
            ai_result = ReasonMapper.map(
                ai_result=ai_result,
                mission_type=mission_type
            )


            return ai_result



        # ==========================
        # Unsupported
        # ==========================

        raise ValueError(
            f"지원하지 않는 mission_type입니다: {mission_type}"
        )