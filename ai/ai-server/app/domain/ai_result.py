from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.domain.mission_result import ReasonCode
from app.domain.model_info import ModelType



@dataclass
class DetectedObject:
    """
    AI 모델이 탐지한 객체 정보
    """

    name: str

    confidence: float



@dataclass
class AttributeResult:
    """
    객체 속성 판단 결과
    """

    name: str

    value: str

    confidence: float



@dataclass
class AIResult:
    """
    AI 모델 공통 결과 DTO

    모든 Vision Model 결과를
    동일한 형태로 관리하기 위한 공통 DTO
    """


    # ==========================
    # 기본 AI 판단 결과
    # ==========================

    success: Optional[bool] = None


    confidence: float = 0.0


    reason: str = ""



    # ==========================
    # UNKNOWN / FAIL 판단 근거
    # ==========================

    reason_code: Optional[ReasonCode] = None



    # ==========================
    # Model Tracking
    # ==========================

    # 실제 사용 모델명
    model_name: str = ""


    # 모델 역할
    model_type: Optional[ModelType] = None


    # 모델 추론 시간(ms)
    latency_ms: float = 0.0


    # ==========================
    # Vision Model 결과
    # ==========================

    detected_objects: List[DetectedObject] = field(
        default_factory=list
    )


    attributes: List[AttributeResult] = field(
        default_factory=list
    )



    # ==========================
    # 이미지 분석 결과
    # ==========================

    image_quality: Dict = field(
        default_factory=dict
    )



    # ==========================
    # 추가 모델 정보
    # ==========================

    metadata: Dict = field(
        default_factory=dict
    )