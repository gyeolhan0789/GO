import logging

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


logger = logging.getLogger(__name__)


class ObjectMatchRule:
    """
    SigLIP 후보 비교 기반 객체 매칭 Rule

    역할
    -------------------------
    - 존재하는 객체가 미션 대상인지 판단
    - candidate score 비교
    - PASS / UNCERTAIN / FAIL 반환
    """


    # 최고 후보 최소 confidence
    MIN_MATCH_SCORE = 0.3


    # 1등과 2등 후보 차이
    MIN_SCORE_MARGIN = 0.1



    def validate(
        self,
        scores: dict,
        target: str
    ) -> AIResult:


        if not scores:

            return AIResult(

                success=False,

                confidence=0.0,

                reason="No candidates",

                reason_code=ReasonCode.OBJECT_UNCERTAIN

            )



        sorted_scores = sorted(

            scores.items(),

            key=lambda x: x[1],

            reverse=True

        )


        top_label, top_score = sorted_scores[0]


        second_score = (

            sorted_scores[1][1]

            if len(sorted_scores) > 1

            else 0.0

        )


        margin = (

            top_score
            -
            second_score

        )



        logger.info(

            "[Object Match] "
            "target=%s top=%s score=%.4f margin=%.4f",

            target,

            top_label,

            top_score,

            margin

        )



        # ----------------------
        # 대상 객체 매칭 여부
        # ----------------------

        is_target = (

            target.lower()

            in

            top_label.lower()

        )



        if (

            is_target

            and

            top_score >= self.MIN_MATCH_SCORE

            and

            margin >= self.MIN_SCORE_MARGIN

        ):


            return AIResult(

                success=True,

                confidence=top_score,

                reason=(

                    f"Matched object: {top_label}"

                ),

                reason_code=ReasonCode.PASS

            )



        # 애매한 경우

        if (

            top_score >= self.MIN_MATCH_SCORE

        ):


            return AIResult(

                success=False,

                confidence=top_score,

                reason=(

                    f"Uncertain object: {top_label}"

                ),

                reason_code=ReasonCode.OBJECT_UNCERTAIN

            )



        # 객체 없음

        return AIResult(

            success=False,

            confidence=top_score,

            reason=(

                f"Object mismatch: {top_label}"

            ),

            reason_code=ReasonCode.OBJECT_NOT_FOUND

        )