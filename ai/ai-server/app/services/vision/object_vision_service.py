import logging

from io import BytesIO

from PIL import Image

from app.domain.ai_result import AIResult

from app.services.vision.siglip2_service import (
    SigLIP2Service
)

from app.mappers.siglip_result_mapper import (
    SigLIPResultMapper
)

from app.services.rule_engine.siglip_rule_engine import (
    SigLIPRuleEngine
)


logger = logging.getLogger(__name__)



class ObjectVisionService:
    """
    OBJECT Mission 전용 Vision Pipeline

    역할
    -----------------------
    - OBJECT 미션 이미지 분석
    - SigLIP2 기반 객체 matching
    - RuleEngine 기반 판정
    - AIResult 반환


    Pipeline
    -----------------------

    Image
      |
      v
    SigLIP2Service
      |
      v
    SigLIPResultMapper
      |
      v
    SigLIPRuleEngine
      |
      v
    AIResult


    책임 제외
    -----------------------
    - API Response 변환
    - 이미지 품질 검사
    - Mission Type Routing
    """


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



    def verify(
        self,
        image_bytes: bytes,
        decision_condition: dict
    ) -> AIResult:


        # ==========================
        # Image Convert
        # ==========================

        image = Image.open(
            BytesIO(image_bytes)
        ).convert(
            "RGB"
        )



        # ==========================
        # Target Object 추출
        # ==========================

        target = (

            decision_condition.get(
                "target"
            )

            or

            decision_condition.get(
                "object"
            )

        )


        if not target:

            raise ValueError(
                "OBJECT 미션은 target 조건이 필요합니다."
            )



        logger.info(
            "[OBJECT] target=%s",
            target
        )



        # ==========================
        # SigLIP Candidate 생성
        # ==========================

        candidates = [

            f"a photo of a {target}",

            f"not a {target}"

        ]



        # ==========================
        # SigLIP2 Inference
        # ==========================

        siglip_result = (
            self.siglip_service.predict(
                image=image,
                candidates=candidates
            )
        )



        logger.info(
            "[SigLIP Result] %s",
            siglip_result
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



        logger.info(
            "[OBJECT Decision] success=%s confidence=%s reason_code=%s",
            ai_result.success,
            ai_result.confidence,
            ai_result.reason_code
        )


        return ai_result