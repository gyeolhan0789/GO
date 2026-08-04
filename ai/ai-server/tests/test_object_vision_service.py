import io

from unittest.mock import Mock, patch

from PIL import Image

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode

from app.services.vision.object_vision_service import (
    ObjectVisionService
)



def create_image_bytes():

    image = Image.new(
        "RGB",
        (20, 20),
        color="white"
    )

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="JPEG"
    )

    return buffer.getvalue()



def create_service():

    """
    SigLIP 실제 모델 로딩 방지

    ObjectVisionService 생성 시
    SigLIP2Service() 호출 Mock 처리
    """

    with patch(
        "app.services.vision.object_vision_service.SigLIP2Service"
    ) as mock_siglip:

        service = ObjectVisionService()

        service.siglip_service = (
            mock_siglip.return_value
        )

        return service



def test_object_pass_without_fallback():

    service = create_service()


    service.siglip_service.predict = Mock(
        return_value={
            "top_label": "a photo of a flower",
            "confidence": 0.80,
            "scores": {
                "a photo of a flower": 0.80,
                "not a flower": 0.20
            },
            "latency_ms": 120
        }
    )


    service.gemini_service.verify_mission = Mock()


    result = service.verify(
        image_bytes=create_image_bytes(),
        decision_condition={
            "target": "flower"
        }
    )


    assert result.success is True

    assert result.reason_code == (
        ReasonCode.PASS
    )


    service.gemini_service.verify_mission.assert_not_called()



def test_object_not_found_without_fallback():

    service = create_service()


    service.siglip_service.predict = Mock(
        return_value={
            "top_label": "not a flower",
            "confidence": 0.95,
            "scores": {
                "a photo of a flower": 0.05,
                "not a flower": 0.95
            },
            "latency_ms": 120
        }
    )


    service.gemini_service.verify_mission = Mock()


    result = service.verify(
        image_bytes=create_image_bytes(),
        decision_condition={
            "target": "flower"
        }
    )


    assert result.success is False

    assert result.reason_code == (
        ReasonCode.OBJECT_NOT_FOUND
    )


    service.gemini_service.verify_mission.assert_not_called()



def test_object_uncertain_gemini_success():

    service = create_service()


    service.siglip_service.predict = Mock(
        return_value={
            "top_label": "a photo of a flower",
            "confidence": 0.55,
            "scores": {
                "a photo of a flower": 0.55,
                "not a flower": 0.45
            },
            "latency_ms": 120
        }
    )


    service.gemini_service.verify_mission = Mock(
        return_value=AIResult(
            success=True,
            confidence=0.91,
            reason="flower detected"
        )
    )


    result = service.verify(
        image_bytes=create_image_bytes(),
        decision_condition={
            "target": "flower"
        }
    )


    assert result.success is True

    assert result.reason_code == (
        ReasonCode.PASS
    )


    service.gemini_service.verify_mission.assert_called_once()



def test_object_uncertain_gemini_fail():

    service = create_service()


    service.siglip_service.predict = Mock(
        return_value={
            "top_label": "a photo of a flower",
            "confidence": 0.55,
            "scores": {
                "a photo of a flower": 0.55,
                "not a flower": 0.45
            },
            "latency_ms": 120
        }
    )


    service.gemini_service.verify_mission = Mock(
        return_value=AIResult(
            success=False,
            confidence=0.78,
            reason="object not found"
        )
    )


    result = service.verify(
        image_bytes=create_image_bytes(),
        decision_condition={
            "target": "flower"
        }
    )


    assert result.success is False

    assert result.reason_code == (
        ReasonCode.OBJECT_NOT_FOUND
    )


    service.gemini_service.verify_mission.assert_called_once()



def test_object_uncertain_gemini_exception_keep_siglip():

    """
    Gemini API 장애 상황

    기대:
    - SigLIP 결과 유지
    - OBJECT_UNCERTAIN 반환
    - fallback 실패 기록
    """


    service = create_service()


    service.siglip_service.predict = Mock(
        return_value={
            "top_label": "a photo of a flower",
            "confidence": 0.55,
            "scores": {
                "a photo of a flower": 0.55,
                "not a flower": 0.45
            },
            "latency_ms": 120
        }
    )


    service.gemini_service.verify_mission = Mock(
        side_effect=Exception(
            "Gemini API timeout"
        )
    )


    result = service.verify(
        image_bytes=create_image_bytes(),
        decision_condition={
            "target": "flower"
        }
    )


    assert result.success is False


    assert result.reason_code == (
        ReasonCode.OBJECT_UNCERTAIN
    )


    assert (
        result.metadata["fallback_status"]
        ==
        "FAILED"
    )


    assert (
        result.metadata["fallback_error"]
        ==
        "Gemini API timeout"
    )


    service.gemini_service.verify_mission.assert_called_once()