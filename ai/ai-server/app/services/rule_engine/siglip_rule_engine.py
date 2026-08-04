import logging

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


logger = logging.getLogger(__name__)


class SigLIPRuleEngine:
    """
    SigLIP2 Object Validation Rule Engine

    역할
    -----------------------
    - SigLIP similarity score 기반 객체 판정
    - PASS / OBJECT_NOT_FOUND / OBJECT_UNCERTAIN 결정
    - AIResult 업데이트

    책임 제외
    -----------------------
    - SigLIP2 inference
    - Mission routing
    - Gemini fallback
    """

    # PASS 판정 기준
    # 높은 확신이 있을 때만 성공 처리
    PASS_THRESHOLD = 0.80

    # Top1과 Top2 score 차이
    # 비슷한 후보가 있으면 uncertain 처리
    MARGIN_THRESHOLD = 0.20

    # 객체 존재 여부 최소 기준
    # 이보다 낮으면 객체 없음
    NOT_FOUND_THRESHOLD = 0.30



    def validate(
        self,
        ai_result: AIResult
    ) -> AIResult:


        scores = ai_result.metadata.get(
            "similarity_scores",
            {}
        )


        # ==================================
        # Score 없음
        # ==================================

        if not scores:

            ai_result.success = False

            ai_result.confidence = 0.0

            ai_result.reason = (
                "SigLIP similarity score가 존재하지 않습니다."
            )

            ai_result.reason_code = (
                ReasonCode.OBJECT_UNCERTAIN
            )


            logger.warning(
                "[SigLIP Rule] similarity score 없음"
            )

            return ai_result



        # ==================================
        # Top1 / Top2 계산
        # ==================================

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
            top_score - second_score
        )


        ai_result.metadata.update(
            {
                "top_label": top_label,
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



        # ==================================
        # OBJECT_NOT_FOUND
        #
        # 후보 객체 자체가 거의 없는 경우
        # ==================================

        if top_score < self.NOT_FOUND_THRESHOLD:


            ai_result.success = False

            ai_result.confidence = (
                float(top_score)
            )


            ai_result.reason = (
                f"{top_label} 객체를 확인할 수 없습니다."
            )


            ai_result.reason_code = (
                ReasonCode.OBJECT_NOT_FOUND
            )


            logger.info(
                "[SigLIP Rule] OBJECT_NOT_FOUND score=%.4f",
                top_score
            )


            return ai_result



        # ==================================
        # PASS
        #
        # 높은 score + 명확한 차이
        # ==================================

        if (
            top_score >= self.PASS_THRESHOLD
            and
            margin >= self.MARGIN_THRESHOLD
        ):


            ai_result.success = True

            ai_result.confidence = (
                float(top_score)
            )


            ai_result.reason = (
                f"{top_label} 객체가 명확하게 감지되었습니다."
            )


            ai_result.reason_code = (
                ReasonCode.PASS
            )


            logger.info(
                "[SigLIP Rule] PASS label=%s confidence=%.4f margin=%.4f",
                top_label,
                top_score,
                margin
            )


            return ai_result



        # ==================================
        # OBJECT_UNCERTAIN
        #
        # Gemini fallback 대상
        # ==================================

        ai_result.success = False

        ai_result.confidence = (
            float(top_score)
        )


        ai_result.reason = (
            f"{top_label} 객체 판정이 불확실합니다."
        )


        ai_result.reason_code = (
            ReasonCode.OBJECT_UNCERTAIN
        )


        logger.info(
            "[SigLIP Rule] OBJECT_UNCERTAIN score=%.4f margin=%.4f",
            top_score,
            margin
        )


        return ai_result