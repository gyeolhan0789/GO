from enum import Enum


class ModelType(str, Enum):
    """
    AI 모델 유형
    """

    VISION = "VISION"

    LLM = "LLM"