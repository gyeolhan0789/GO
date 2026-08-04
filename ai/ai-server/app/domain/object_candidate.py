from dataclasses import dataclass


@dataclass
class ObjectCandidateResult:
    """
    SigLIP2 객체 후보 결과

    실제 성공 판단 아님
    ObjectVerifier 입력용
    """

    target: str

    detected: bool

    confidence: float

    positive_score: float

    negative_score: float

    margin: float

    reason: str