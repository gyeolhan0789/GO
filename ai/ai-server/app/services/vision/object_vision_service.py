import logging

from io import BytesIO

from PIL import Image

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode

from app.prompts.prompt_builder import PromptBuilder

from app.services.vision.siglip2_service import (
    SigLIP2Service
)

from app.services.vision.gemini_service import (
    GeminiService
)

from app.mappers.siglip_result_mapper import (
    SigLIPResultMapper
)

from app.mappers.reason_mapper import (
    ReasonMapper
)

from app.services.rule_engine.siglip_rule_engine import (
    SigLIPRuleEngine
)


logger = logging.getLogger(__name__)


class ObjectVisionService:
    """
    OBJECT Mission Vision Pipeline

    Image
      |
      v
    SigLIP2
      |
      v
    Rule Engine
      |
      + PASS
      + OBJECT_NOT_FOUND
      + OBJECT_UNCERTAIN
                |
                v
          Gemini Fallback
    """


    COMMON_OBJECTS = [
        "flower",
        "dog",
        "cat",
        "cup",
        "bottle",
        "book",
        "phone",
        "pen",
        "keyboard",
        "mouse",
        "wallet",
        "watch",
        "glasses",
        "toy"
    ]



    def __init__(self):

        self.siglip_service = (
            SigLIP2Service()
        )

        self.mapper = (
            SigLIPResultMapper()
        )

        self.rule_engine = (
            SigLIPRuleEngine()
        )

        self.gemini_service = (
            GeminiService()
        )



    def verify(
        self,
        image_bytes: bytes,
        decision_condition: dict
    ) -> AIResult:


        # ==========================
        # Image Convert
        # ==========================

        image = (
            Image.open(
                BytesIO(image_bytes)
            )
            .convert("RGB")
        )



        # ==========================
        # Target Object
        # ==========================

        target = (
            decision_condition.get(
                "target"
            )
        )


        if not target:

            raise ValueError(
                "OBJECT target 조건이 필요합니다."
            )



        logger.info(
            "[OBJECT] target=%s",
            target
        )



        # ==========================
        # SigLIP Candidate 생성
        # ==========================

        candidates = (
            self._build_candidates(
                target
            )
        )


        logger.info(
            "[SigLIP Candidates] %s",
            candidates
        )



        # ==========================
        # SigLIP Inference
        # ==========================

        siglip_result = (
            self.siglip_service.predict(
                image=image,
                candidates=candidates
            )
        )



        logger.info(
            "[SigLIP Result] "
            "top=%s confidence=%.4f",
            siglip_result["top_label"],
            siglip_result["confidence"]
        )



        # ==========================
        # Mapping
        # ==========================

        ai_result = (
            self.mapper.map(
                siglip_result
            )
        )



        # ==========================
        # Rule Engine
        # ==========================

        ai_result = (
            self.rule_engine.validate(
                ai_result
            )
        )



        # ==========================
        # SigLIP 직접 결정
        # ==========================

        if (
            ai_result.reason_code
            !=
            ReasonCode.OBJECT_UNCERTAIN
        ):

            logger.info(
                "[OBJECT Decision] "
                "success=%s confidence=%.4f reason=%s",
                ai_result.success,
                ai_result.confidence,
                ai_result.reason_code
            )

            return ai_result



        # ==========================
        # Gemini Fallback
        # ==========================

        logger.info(
            "[Gemini Fallback] "
            "score=%.4f margin=%.4f",
            ai_result.metadata.get(
                "top_score",
                0.0
            ),
            ai_result.metadata.get(
                "margin",
                0.0
            )
        )



        try:

            prompt = (
                PromptBuilder.build(
                    mission_type="OBJECT",
                    decision_condition=decision_condition
                )
            )


            gemini_result = (
                self.gemini_service.verify_mission(
                    image_bytes=image_bytes,
                    prompt=prompt
                )
            )



            gemini_result = (
                ReasonMapper.map(
                    ai_result=gemini_result,
                    mission_type="OBJECT"
                )
            )


            return gemini_result



        except Exception as e:


            logger.exception(
                "[Gemini Fallback] failed"
            )


            ai_result.reason = (
                "객체를 명확하게 판별할 수 없습니다."
            )


            ai_result.metadata.update(
                {
                    "fallback_status": "FAILED",
                    "fallback_error": str(e)
                }
            )


            return ai_result



    def _build_candidates(
        self,
        target: str
    ) -> list[str]:
        """
        SigLIP 비교 후보 생성

        target:
            미션 대상 객체

        예:
            flower

        결과:
            [
                "a photo of a flower",
                "a photo of a dog",
                ...
            ]
        """

        objects = [
            target
        ] + [
            obj
            for obj in self.COMMON_OBJECTS
            if obj != target
        ]


        return [
            f"a photo of a {obj}"
            for obj in objects
        ]