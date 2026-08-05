from dataclasses import dataclass
from typing import Optional


@dataclass
class ObjectExistResult:
    """
    OBJECT Pipeline Intermediate Result


    Pipeline:

    Image
        ↓
    SigLIP2
        ↓
    SigLIPRuleEngine
        ↓
    ObjectExistResult
        ↓
    ObjectVerifier
        ↓
    AIResult


    Responsibility
    ----------------

    SigLIP 기반 객체 후보 판단 결과 저장

    """

    # ==========================
    # Basic
    # ==========================

    target: str


    # 객체 후보 존재 여부
    detected: bool


    # detection confidence
    confidence: float


    # 판단 이유
    reason: str



    # ==========================
    # SigLIP Score
    # ==========================

    positive_score: float = 0.0


    negative_score: float = 0.0


    # positive - negative
    margin: float = 0.0



    # ==========================
    # Object Verifier Result
    # ==========================

    # 실제 물체인지 여부

    # True:
    #   실제 꽃
    #
    # False:
    #   꽃 그림
    #   스티커
    #   화면
    #   장난감

    is_real_object: Optional[bool] = None



    # Gemini verifier confidence

    verifier_confidence: float = 0.0



    verifier_reason: Optional[str] = None



    # ==========================
    # Metadata
    # ==========================

    model_name: str = "siglip2"


    verifier_model_name: Optional[str] = None