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

    "객체 후보가 존재하는가"

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


    # 최소 score
    # 너무 작은 noise 제거

    MIN_POSITIVE_SCORE = 0.0001



    # positive-negative 차이

    DETECT_MARGIN = 0.0001



    # 강한 후보

    STRONG_MARGIN = 0.005



    def create_object_result(
        self,
        target: str,
        scores: dict
    ) -> ObjectExistResult:
        """
        SigLIP score -> ObjectExistResult


        scores example:

        {
            "a photo of a real flower":0.019,
            "a photo without a flower":0.015
        }

        """



        positive_score = 0.0

        negative_score = 0.0



        for label, score in scores.items():


            if "without" in label:

                negative_score = score


            else:

                positive_score = score



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



        confidence = (
            self._calculate_confidence(
                positive_score,
                negative_score
            )
        )



        logger.info(
            """
[SigLIP Candidate]

target=%s

positive=%.6f

negative=%.6f

margin=%.6f

confidence=%.3f

""",
            target,

            positive_score,

            negative_score,

            margin,

            confidence

        )



        # ==========================
        # Candidate Detected
        # ==========================


        if (

            positive_score
            >=
            self.MIN_POSITIVE_SCORE

            and

            margin
            >=
            self.DETECT_MARGIN

        ):


            return ObjectExistResult(

                target=target,

                detected=True,

                confidence=confidence,

                reason=(
                    f"{target} candidate detected"
                ),

                positive_score=positive_score,

                negative_score=negative_score,

                margin=margin

            )




        # ==========================
        # Candidate Not Found
        # ==========================


        return ObjectExistResult(

            target=target,

            detected=False,

            confidence=confidence,

            reason=(
                f"{target} candidate not found"
            ),

            positive_score=positive_score,

            negative_score=negative_score,

            margin=margin

        )





    def _calculate_confidence(
        self,
        positive: float,
        negative: float
    ) -> float:
        """
        SigLIP score normalization

        """

        total = (
            positive
            +
            negative
        )


        if total <= 0:

            return 0.0



        confidence = (
            positive
            /
            total
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