from app.prompts.prompt_builder import PromptBuilder

from app.services.vision.gemini_service import GeminiService
from app.services.vision.image_quality_service import ImageQualityService

from app.validators.mission_validator import MissionValidator

from app.schemas.mission import MissionResponse


class MissionService:
    """
    미션 검증 전체 흐름을 담당하는 서비스

    HTTP(FastAPI)와 무관한 순수 비즈니스 로직만 포함
    """

    def __init__(self):

        self.gemini_service = GeminiService()

        self.image_quality_service = ImageQualityService()

    def verify(
        self,
        image_bytes: bytes,
        mission_type: str,
        decision_condition: dict
    ) -> MissionResponse:

        # -----------------------------
        # Prompt 생성
        # -----------------------------

        prompt = PromptBuilder.build(
            mission_type=mission_type,
            decision_condition=decision_condition
        )

        # -----------------------------
        # 이미지 품질 검사
        # -----------------------------

        quality_result = self.image_quality_service.check(
            image_bytes
        )

        if quality_result is not None:

            return MissionValidator.validate(
                quality_result
            )

        # -----------------------------
        # Gemini 판정
        # -----------------------------

        ai_result = self.gemini_service.verify_mission(
            image_bytes=image_bytes,
            prompt=prompt
        )

        # -----------------------------
        # 최종 응답 생성
        # -----------------------------

        return MissionValidator.validate(
            ai_result
        )