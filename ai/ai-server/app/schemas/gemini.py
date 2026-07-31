from pydantic import BaseModel, Field


class GeminiRawResponse(BaseModel):
    """
    Gemini Structured Output 전용 DTO

    Gemini -> AIResult 변환용
    """

    success: bool = Field(
        description="Gemini 판단 성공 여부"
    )


    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Gemini 판단 신뢰도"
    )


    reason: str = Field(
        description="Gemini 판단 근거"
    )