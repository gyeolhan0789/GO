import logging


from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


logger = logging.getLogger(__name__)


class ObjectVerifierService:
    """
    OBJECT Real Object Verification Layer


    Flow

    SigLIP2 Candidate

          ↓

    Local Verification

          ↓

    REAL
        PASS


    NON_REAL
        FAIL


    UNCERTAIN

          ↓

    Gemini fallback

    """



    # ==========================
    # Threshold
    # ==========================


    # 실제 객체 후보

    REAL_CONFIDENCE_THRESHOLD = 0.85

    REAL_MARGIN_THRESHOLD = 0.01

    REAL_MIN_POSITIVE_SCORE = 0.01



    # 너무 낮은 score는 객체 아님

    NON_REAL_CONFIDENCE_THRESHOLD = 0.20

    NON_REAL_MARGIN_THRESHOLD = -0.002



    # 강한 positive score라도
    # screen / poster 가능성 존재

    HIGH_SCORE_GEMINI_THRESHOLD = 0.015



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



        local_result = (
            self._local_verify(
                object_result
            )
        )


        logger.info(
            "[ObjectVerifier] local_result=%s",
            local_result
        )



        # ==========================
        # REAL
        # ==========================

        if local_result == "REAL":

            return AIResult(

                success=True,

                confidence=object_result.confidence,

                reason=(
                    f"real {target} detected"
                ),

                reason_code=ReasonCode.PASS,

                detected_objects=[
                    target
                ],

                metadata={

                    "decision_source":
                        "OBJECT_VERIFIER_LOCAL",

                    "verification":
                        "REAL",

                    "siglip_candidate":
                        self._candidate_metadata(
                            object_result
                        )

                }

            )



        # ==========================
        # NON REAL
        # ==========================

        if local_result == "NON_REAL":

            return AIResult(

                success=False,

                confidence=object_result.confidence,

                reason=(
                    f"{target} is not real object"
                ),

                reason_code=
                    ReasonCode.OBJECT_NOT_FOUND,

                detected_objects=[],

                metadata={

                    "decision_source":
                        "OBJECT_VERIFIER_LOCAL",

                    "verification":
                        "NON_REAL",

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
    ) -> str:



        confidence = object_result.confidence

        margin = object_result.margin

        positive = object_result.positive_score

        negative = object_result.negative_score



        logger.info(
            """
[ObjectVerifier Local]

confidence=%.3f

positive=%.6f

negative=%.6f

margin=%.6f

""",
            confidence,
            positive,
            negative,
            margin

        )



        # ==========================
        # NON REAL
        # ==========================

        if (

            confidence
            <=
            self.NON_REAL_CONFIDENCE_THRESHOLD

            or

            margin
            <=
            self.NON_REAL_MARGIN_THRESHOLD

        ):

            return "NON_REAL"




        # ==========================
        # High score ambiguity
        #
        # screen / poster / sticker
        #
        # Gemini 검증
        # ==========================

        if (

            positive
            >=
            self.HIGH_SCORE_GEMINI_THRESHOLD

        ):

            return "UNCERTAIN"




        # ==========================
        # REAL
        # ==========================

        if (

            confidence
            >=
            self.REAL_CONFIDENCE_THRESHOLD

            and

            margin
            >=
            self.REAL_MARGIN_THRESHOLD

            and

            positive
            >=
            self.REAL_MIN_POSITIVE_SCORE

            and

            positive
            >
            negative

        ):

            return "REAL"



        return "UNCERTAIN"





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
You are a real physical object verification system.

Your task is NOT only object recognition.

You must determine whether the target is a REAL physical object captured by a camera.


Target object:

{target}


PASS only when:

- The object exists physically in the real world.
- The image is a real photograph.
- Natural texture, lighting, shadows, depth, and material details are visible.


FAIL when the target is:

- drawing
- painting
- illustration
- cartoon
- sticker
- poster
- printed image
- image displayed on a screen
- toy
- miniature model
- artificial representation instead of the real object


Important rules:

- Do not judge only by object appearance.
- A flower image on a phone screen is NOT a real flower.
- A flower printed on paper, clothes, bag, or poster is NOT a real flower.
- Judge whether the physical object itself exists in the scene.


Return JSON only.

Format:

{{
    "success": true,
    "confidence": 0.95,
    "reason": "brief explanation"
}}

"""


        result = (
            self.gemini_service.verify_mission(
                image_bytes=image_bytes,
                prompt=prompt
            )
        )



        if result.success:

            result.reason_code = (
                ReasonCode.PASS
            )

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



        result.metadata.update(

            {

                "decision_source":
                    "GEMINI_FALLBACK",

                "siglip_candidate":
                    self._candidate_metadata(
                        object_result
                    )

            }

        )


        return result