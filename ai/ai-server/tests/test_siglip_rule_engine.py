import pytest

from app.mappers.siglip_result_mapper import (
    SigLIPResultMapper
)

from app.services.rule_engine.siglip_rule_engine import (
    SigLIPRuleEngine
)

from app.domain.mission_result import ReasonCode



@pytest.fixture
def mapper():

    return SigLIPResultMapper()



@pytest.fixture
def rule_engine():

    return SigLIPRuleEngine()



def test_siglip_object_pass(
    mapper,
    rule_engine
):
    """
    Positive candidate가 명확하게 높은 경우

    PASS 판정 테스트
    """

    siglip_result = {

        "top_label": "a flower",

        "confidence": 0.79,

        "scores": {

            "a flower": 0.79,

            "not a flower": 0.21

        }
    }


    ai_result = mapper.map(
        siglip_result
    )


    result = rule_engine.validate(
        ai_result
    )


    assert result.success is True

    assert result.reason_code == (
        ReasonCode.PASS
    )

    assert result.confidence == 0.79

    assert (
        result.metadata["top_score"]
        == 0.79
    )



def test_siglip_object_not_found(
    mapper,
    rule_engine
):
    """
    Negative candidate가 Top1인 경우

    꽃 미션에서 고양이 이미지 상황

    OBJECT_NOT_FOUND 판정 테스트
    """

    siglip_result = {

        "top_label": "not a flower",

        "confidence": 0.85,

        "scores": {

            "a flower": 0.15,

            "not a flower": 0.85

        }
    }


    ai_result = mapper.map(
        siglip_result
    )


    result = rule_engine.validate(
        ai_result
    )


    assert result.success is False

    assert result.reason_code == (
        ReasonCode.OBJECT_NOT_FOUND
    )

    assert result.confidence == 0.85

    assert result.reason == (
        "flower 객체가 감지되지 않았습니다."
    )



def test_siglip_object_uncertain(
    mapper,
    rule_engine
):
    """
    Positive / Negative 후보 차이가 작은 경우

    OBJECT_UNCERTAIN 판정 테스트
    """

    siglip_result = {

        "top_label": "a flower",

        "confidence": 0.52,

        "scores": {

            "a flower": 0.52,

            "not a flower": 0.48

        }
    }


    ai_result = mapper.map(
        siglip_result
    )


    result = rule_engine.validate(
        ai_result
    )


    assert result.success is False

    assert result.reason_code == (
        ReasonCode.OBJECT_UNCERTAIN
    )

    assert result.confidence == 0.52



def test_siglip_empty_score(
    mapper,
    rule_engine
):
    """
    similarity score가 없는 예외 상황 테스트
    """

    siglip_result = {

        "top_label": "",

        "confidence": 0.0,

        "scores": {}

    }


    ai_result = mapper.map(
        siglip_result
    )


    result = rule_engine.validate(
        ai_result
    )


    assert result.success is False

    assert result.reason_code == (
        ReasonCode.OBJECT_UNCERTAIN
    )

    assert (
        "Similarity score"
        in result.reason
    )