import logging

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


logger = logging.getLogger(__name__)



class SigLIPRuleEngine:
    """
    SigLIP2 Object Validation Rule Engine

    역할
    -----------------------
    - SigLIP similarity score 기반 객체 미션 판정
    - PASS / OBJECT_UNCERTAIN / OBJECT_NOT_FOUND 결정
    - AIResult 업데이트

    책임 제외
    -----------------------
    - SigLIP2 추론
    - Mission Type Routing
    - Gemini Fallback
    """



    PASS_SCORE = 0.50

    PASS_MARGIN = 0.20



    def validate(
        self,
        ai_result: AIResult
    ) -> AIResult:


        scores = ai_result.metadata.get(
            "similarity_scores",
            {}
        )



        # ==========================
        # Score 없음
        # ==========================

        if not scores:


            ai_result.success = False

            ai_result.reason = (
                "Similarity score가 존재하지 않습니다."
            )

            ai_result.reason_code = (
                ReasonCode.OBJECT_UNCERTAIN
            )


            logger.warning(
                "[SigLIP Rule] score 없음"
            )


            return ai_result



        # ==========================
        # Top1 / Top2 계산
        # ==========================

        sorted_scores = sorted(
            scores.items(),
            key=lambda x: x[1],
            reverse=True
        )



        top_label, top_score = (
            sorted_scores[0]
        )


        second_score = (

            sorted_scores[1][1]

            if len(sorted_scores) > 1

            else 0.0

        )


        margin = (
            top_score - second_score
        )



        ai_result.metadata.update(
            {
                "top_score": float(top_score),
                "second_score": float(second_score),
                "margin": float(margin)
            }
        )



        logger.info(
            "[SigLIP Rule] top=%s score=%.4f second=%.4f margin=%.4f",
            top_label,
            top_score,
            second_score,
            margin
        )



        # ==========================
        # OBJECT_NOT_FOUND
        #
        # 예:
        # top_label = "not a flower"
        # ==========================

        if top_label.startswith(
            "not a"
        ):


            ai_result.success = False

            ai_result.confidence = (
                float(top_score)
            )


            detected_object = (
                top_label.replace(
                    "not a ",
                    ""
                )
            )


            ai_result.reason = (
                f"{detected_object} 객체가 감지되지 않았습니다."
            )


            ai_result.reason_code = (
                ReasonCode.OBJECT_NOT_FOUND
            )


            logger.info(
                "[SigLIP Rule] OBJECT_NOT_FOUND label=%s",
                top_label
            )


            return ai_result



        # ==========================
        # PASS
        # ==========================

        if (

            top_score >= self.PASS_SCORE

            and

            margin >= self.PASS_MARGIN

        ):


            ai_result.success = True

            ai_result.confidence = (
                float(top_score)
            )


            ai_result.reason = (
                f"{top_label} 객체가 감지되었습니다."
            )


            ai_result.reason_code = (
                ReasonCode.PASS
            )


            logger.info(
                "[SigLIP Rule] PASS label=%s confidence=%.4f",
                top_label,
                top_score
            )


            return ai_result



        # ==========================
        # OBJECT_UNCERTAIN
        # ==========================

        ai_result.success = False

        ai_result.confidence = (
            float(top_score)
        )


        ai_result.reason = (
            "객체를 명확하게 판별할 수 없습니다."
        )


        ai_result.reason_code = (
            ReasonCode.OBJECT_UNCERTAIN
        )


        logger.info(
            "[SigLIP Rule] OBJECT_UNCERTAIN confidence=%.4f",
            top_score
        )


        return ai_result