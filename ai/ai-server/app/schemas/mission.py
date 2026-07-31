from pydantic import BaseModel, Field

from app.domain.mission_result import (
    MissionStatus,
    ReasonCode
)


class MissionResponse(BaseModel):
    """
    클라이언트에게 반환되는 최종 미션 판정 결과
    """

    status: MissionStatus = Field(
        description="SUCCESS / FAIL / UNKNOWN"
    )

    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="최종 AI 신뢰도"
    )

    reason_code: ReasonCode = Field(
        description="판정 코드"
    )

    reason: str = Field(
        description="사용자에게 보여줄 설명"
    )