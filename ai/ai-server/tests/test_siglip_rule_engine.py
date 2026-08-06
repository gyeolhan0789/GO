import logging

from app.domain.object_exist_result import ObjectExistResult


logger = logging.getLogger(__name__)


class SigLIPRuleEngine:
    """
    SigLIP2 Object Existence Rule Engine

    역할
    ------------------------
    - SigLIP positive / negative score 분석
    - margin 계산
    - confidence 계산
    - ObjectExistResult 생성

    ※ 최종 성공/실패 판단은 ObjectExistRule 담당
    """


    def create_object_result(
        self,
        target: str,
        scores: dict
    ) -> ObjectExistResult:


        positive_key = (
            f"a photo of a real {target}"
        )

        negative_key = (
            f"a photo without a {target}"
        )


        positive_score = scores.get(
            positive_key,
            0.0
        )

        negative_score = scores.get(
            negative_key,
            0.0
        )


        margin = (
            positive_score
            -
            negative_score
        )


        confidence = self._calculate_confidence(
            positive_score,
            negative_score
        )


        logger.info(
            "[SigLIP RuleEngine] "
            f"target={target} "
            f"positive={positive_score:.6f} "
            f"negative={negative_score:.6f} "
            f"margin={margin:.6f} "
            f"confidence={confidence:.3f}"
        )


        return ObjectExistResult(

            # Rule 판단 전이므로 기본값
            exists=False,


            confidence=round(
                confidence,
                3
            ),


            positive_score=round(
                positive_score,
                6
            ),


            negative_score=round(
                negative_score,
                6
            ),


            margin=round(
                margin,
                6
            ),


            reason="",


            target=target

        )


    def _calculate_confidence(
        self,
        positive_score: float,
        negative_score: float
    ) -> float:
        """
        Positive / Negative 상대 확률 계산

        SigLIP score는 절대값보다
        positive-negative 관계가 중요하기 때문에
        상대 비율 사용
        """


        total = (
            positive_score
            +
            negative_score
        )


        if total == 0:

            return 0.0


        return (
            positive_score
            /
            total
        )