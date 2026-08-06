import logging

from io import BytesIO
from PIL import Image

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode

from app.services.vision.siglip2_service import SigLIP2Service
from app.services.rule_engine.siglip_rule_engine import SigLIPRuleEngine
from app.services.verifier.object_verifier_service import ObjectVerifierService
from app.services.vision.gemini_service import GeminiService


logger = logging.getLogger(__name__)


class ObjectVisionService:
    """
    OBJECT Mission Vision Pipeline

    Flow:

    Image
      ↓
    SigLIP2 Candidate
      ↓
    Rule Engine
      ↓
    Candidate Filtering
      ↓
    ObjectVerifier
      ↓
    AIResult

    """


    # ==========================
    # Candidate Filtering Threshold
    # ==========================


    # 거의 객체가 없다고 판단되는 최소 score

    MIN_OBJECT_SCORE = 0.00005


    # negative prompt가 우세한 경우

    MIN_MARGIN_FAIL = -0.0001



    def __init__(self):

        self.siglip_service = SigLIP2Service()

        self.rule_engine = SigLIPRuleEngine()


        self.object_verifier = ObjectVerifierService(

            gemini_service=GeminiService()

        )





    def verify(
        self,
        image_bytes: bytes,
        decision_condition: dict
    ) -> AIResult:



        image = (

            Image.open(
                BytesIO(image_bytes)
            )

            .convert("RGB")

        )



        target = decision_condition.get(
            "target"
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


            f"a photo containing a visible {target}",


            f"a photo without any {target}"

        ]



        prediction = (

            self.siglip_service.predict(

                image=image,

                candidates=candidates

            )

        )



        scores = prediction.get(
            "scores",
            {}
        )



        # ==========================
        # 2. Rule Engine
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

detected=%s

confidence=%.3f

positive=%.9f

negative=%.9f

margin=%.9f

""",

            target,

            object_result.detected,

            object_result.confidence,

            object_result.positive_score,

            object_result.negative_score,

            object_result.margin

        )





        # ==========================
        # 3. Clear Object Not Found
        # ==========================


        if (

            object_result.positive_score
            <
            self.MIN_OBJECT_SCORE


            or


            object_result.margin
            <
            self.MIN_MARGIN_FAIL

        ):


            logger.info(
                "[OBJECT] Candidate clearly not found"
            )



            return AIResult(


                success=False,


                confidence=min(

                    object_result.confidence,

                    0.3

                ),



                reason=(

                    f"{target} 객체가 확인되지 않았습니다."

                ),



                reason_code=(

                    ReasonCode.OBJECT_NOT_FOUND

                ),



                detected_objects=[],



                metadata={


                    "decision_source":

                        "SIGLIP2_RULE_ENGINE",



                    "verification":

                        "CLEAR_NOT_FOUND",



                    "siglip_candidate":

                    {


                        "target":

                            target,



                        "detected":

                            object_result.detected,



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
        # 4. Object Verification
        # ==========================


        logger.info(
            "[OBJECT] Send to ObjectVerifier"
        )



        verifier_result = (

            self.object_verifier.verify(

                image_bytes=image_bytes,

                target=target,

                object_result=object_result

            )

        )





        # ==========================
        # 5. Metadata Merge
        # ==========================


        if verifier_result.metadata is None:

            verifier_result.metadata = {}



        verifier_result.metadata.update(


            {


                "siglip_candidate":

                {


                    "target":

                        object_result.target,



                    "detected":

                        object_result.detected,



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