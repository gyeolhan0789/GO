from pydantic import BaseModel, Field


class MissionResponse(BaseModel):
    """
    Gemini Structured Output 응답 DTO
    """

    success: bool = Field(
        description="미션 성공 여부"
    )

    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="AI 신뢰도"
    )

    reason: str = Field(
        description="판정 이유"
    )