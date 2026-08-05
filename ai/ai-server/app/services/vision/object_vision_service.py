import logging

from io import BytesIO

from PIL import Image


from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


from app.services.vision.siglip2_service import (
    SigLIP2Service
)

from app.services.rule_engine.siglip_rule_engine import (
    SigLIPRuleEngine
)

from app.services.verifier.object_verifier_service import (
    ObjectVerifierService
)

from app.services.vision.gemini_service import (
    GeminiService
)


logger = logging.getLogger(__name__)


class ObjectVisionService:
    """
    OBJECT Mission Vision Pipeline


    Responsibility
    ----------------------

    OBJECT 검증 전체 흐름 관리


    Pipeline:

    Image

      ↓

    SigLIP2

    (객체 후보 탐지)

      ↓

    SigLIPRuleEngine

    (candidate 판단)

      ↓

    ObjectExistResult


      ↓


    ObjectVerifier

    (REAL / NON_REAL 판단)

      ↓


    Gemini fallback

    (불확실 케이스)


      ↓


    AIResult


    """



    def __init__(self):

        self.siglip_service = (
            SigLIP2Service()
        )


        self.rule_engine = (
            SigLIPRuleEngine()
        )


        self.object_verifier = (
            ObjectVerifierService(
                gemini_service=GeminiService()
            )
        )



    def verify(
        self,
        image_bytes: bytes,
        decision_condition: dict
    ) -> AIResult:



        # ==========================
        # Image Load
        # ==========================

        image = (
            Image.open(
                BytesIO(image_bytes)
            )
            .convert("RGB")
        )



        # ==========================
        # Target
        # ==========================

        target = (
            decision_condition.get(
                "target"
            )
        )


        if not target:

            raise ValueError(
                "OBJECT target required"
            )



        logger.info(
            "[OBJECT] target=%s",
            target
        )



        # ==========================
        # 1. SigLIP2 Candidate Detection
        # ==========================

        candidates = [

            f"a photo of a real {target}",

            f"a photo without a {target}"

        ]



        prediction = (
            self.siglip_service.predict(
                image=image,
                candidates=candidates
            )
        )



        scores = (
            prediction.get(
                "scores",
                {}
            )
        )



        # ==========================
        # 2. SigLIP Rule Engine
        # ==========================

        object_result = (
            self.rule_engine.create_object_result(
                target=target,
                scores=scores
            )
        )



        logger.info(
            """
[OBJECT Candidate]

target=%s

exists=%s

confidence=%.3f

positive=%.6f

negative=%.6f

margin=%.6f

""",

            target,

            object_result.exists,

            object_result.confidence,

            object_result.positive_score,

            object_result.negative_score,

            object_result.margin

        )



        # ==========================
        # 3. Candidate Not Found
        # ==========================

        if not object_result.exists:


            return AIResult(

                success=False,

                confidence=(
                    object_result.confidence
                ),

                reason=(
                    f"{target} not found"
                ),

                reason_code=(
                    ReasonCode.OBJECT_NOT_FOUND
                ),

                detected_objects=[],


                metadata={

                    "decision_source":
                        "SIGLIP2",


                    "object_candidate":
                    {

                        "target":
                            object_result.target,

                        "positive_score":
                            object_result.positive_score,

                        "negative_score":
                            object_result.negative_score,

                        "margin":
                            object_result.margin,

                        "confidence":
                            object_result.confidence

                    }

                }

            )



        # ==========================
        # 4. Real Object Verification
        # ==========================

        verifier_result = (
            self.object_verifier.verify(
                image_bytes=image_bytes,
                target=target,
                object_result=object_result
            )
        )



        # ==========================
        # 5. Final Metadata Merge
        # ==========================

        if verifier_result.metadata is None:

            verifier_result.metadata = {}



        verifier_result.metadata.update(

            {

                "siglip_candidate":

                {

                    "target":
                        object_result.target,

                    "positive_score":
                        object_result.positive_score,

                    "negative_score":
                        object_result.negative_score,

                    "margin":
                        object_result.margin,

                    "confidence":
                        object_result.confidence

                }

            }

        )


        return verifier_result