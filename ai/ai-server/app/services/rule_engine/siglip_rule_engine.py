import logging

from app.domain.object_exist_result import (
    ObjectExistResult
)


logger = logging.getLogger(__name__)


class SigLIPRuleEngine:
    """
    SigLIP2 Candidate Detection Rule Engine


    Responsibility
    --------------------

    SigLIP score 기반

    "객체 후보 존재 여부"

    판단


    NOT Responsible
    --------------------

    실제 객체 여부 판단

    -> ObjectVerifier 담당


    Pipeline

    SigLIP2

        ↓

    SigLIPRuleEngine

        ↓

    ObjectExistResult

        ↓

    ObjectVerifier

    """



    # ==========================
    # Threshold
    # ==========================


    # 최소 positive score

    MIN_POSITIVE_SCORE = 0.001



    # positive-negative margin

    DETECT_MARGIN = 0.0005





    def create_object_result(
        self,
        target: str,
        scores: dict
    ) -> ObjectExistResult:



        logger.info(
            """
==============================
[SigLIP Raw Scores]

target=%s

scores=%s

==============================
""",
            target,
            scores
        )



        positive_score = 0.0

        negative_score = 0.0


        positive_label = None

        negative_label = None



        for label, score in scores.items():


            label_lower = label.lower()


            if (
                "without" in label_lower
                or
                "no " in label_lower
            ):

                negative_score = score

                negative_label = label


            else:

                positive_score = score

                positive_label = label





        logger.info(
            """
[SigLIP Parsed]

positive_label=%s

positive_score=%.9f


negative_label=%s

negative_score=%.9f

""",

            positive_label,

            positive_score,

            negative_label,

            negative_score

        )



        return self.verify(

            target=target,

            positive_score=positive_score,

            negative_score=negative_score

        )







    def verify(
        self,
        target: str,
        positive_score: float,
        negative_score: float
    ) -> ObjectExistResult:



        margin = (
            positive_score
            -
            negative_score
        )



        candidate_confidence = (
            self._calculate_candidate_confidence(
                positive_score,
                negative_score
            )
        )



        positive_condition = (
            positive_score
            >=
            self.MIN_POSITIVE_SCORE
        )


        margin_condition = (
            margin
            >=
            self.DETECT_MARGIN
        )



        detected = (

            positive_condition

            and

            margin_condition

        )



        logger.info(
            """
[SigLIP Candidate Decision]

target=%s


positive_score=%.9f

negative_score=%.9f

margin=%.9f


candidate_confidence=%.3f


Threshold

MIN_POSITIVE_SCORE=%.6f

DETECT_MARGIN=%.6f


Condition

positive_condition=%s

margin_condition=%s


detected=%s

""",

            target,

            positive_score,

            negative_score,

            margin,

            candidate_confidence,


            self.MIN_POSITIVE_SCORE,

            self.DETECT_MARGIN,


            positive_condition,

            margin_condition,


            detected

        )





        if detected:


            return ObjectExistResult(

                target=target,

                detected=True,

                confidence=candidate_confidence,

                reason=(

                    f"{target} candidate detected"

                ),

                positive_score=positive_score,

                negative_score=negative_score,

                margin=margin

            )





        return ObjectExistResult(

            target=target,

            detected=False,

            confidence=candidate_confidence,

            reason=(

                f"{target} candidate not found"

            ),

            positive_score=positive_score,

            negative_score=negative_score,

            margin=margin

        )







    def _calculate_candidate_confidence(
        self,
        positive: float,
        negative: float
    ) -> float:
        """
        SigLIP candidate confidence

        주의:
        실제 객체 confidence가 아님

        positive prompt와 negative prompt
        상대 score 비율

        """



        total = (

            positive
            +
            negative

        )



        if total <= 0:


            logger.warning(
                "[SigLIP Candidate Confidence] total score is zero"
            )


            return 0.0





        confidence = (

            positive
            /
            total

        )



        logger.info(
            """
[SigLIP Candidate Confidence]

positive=%.9f

negative=%.9f

total=%.9f

candidate_confidence=%.6f

""",

            positive,

            negative,

            total,

            confidence

        )



        return round(

            min(

                max(

                    confidence,

                    0.0

                ),

                1.0

            ),

            3

        )