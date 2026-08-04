from unittest.mock import Mock

import pytest

from app.services.vision.vision_router import (
    VisionRouter
)

from app.domain.ai_result import AIResult

from app.domain.mission_result import (
    ReasonCode
)



@pytest.fixture
def vision_router():

    return VisionRouter()



def test_object_routing(
    vision_router
):
    """
    OBJECT mission은
    ObjectVisionService로 Routing 되는지 테스트
    """

    expected_result = AIResult(
        success=True,
        confidence=0.9,
        reason="flower detected",
        reason_code=ReasonCode.PASS
    )


    vision_router.object_service.verify = Mock(
        return_value=expected_result
    )


    result = vision_router.verify(

        image_bytes=b"test-image",

        mission_type="OBJECT",

        decision_condition={
            "target": "flower"
        }

    )


    vision_router.object_service.verify.assert_called_once()


    assert result.success is True

    assert result.reason_code == (
        ReasonCode.PASS
    )



def test_attribute_routing(
    vision_router
):
    """
    ATTRIBUTE mission은
    Gemini Vision으로 Routing 되는지 테스트
    """

    expected_result = AIResult(
        success=True,
        confidence=0.85,
        reason="attribute detected"
    )


    vision_router.gemini_service.verify_mission = Mock(
        return_value=expected_result
    )


    result = vision_router.verify(

        image_bytes=b"test-image",

        mission_type="ATTRIBUTE",

        decision_condition={

            "target": "flower",

            "constraints": {
                "color": "red"
            }

        }

    )


    vision_router.gemini_service.verify_mission.assert_called_once()


    assert result.success is True



def test_relation_routing(
    vision_router
):
    """
    RELATION mission은
    Gemini Vision으로 Routing 되는지 테스트
    """

    expected_result = AIResult(
        success=True,
        confidence=0.8,
        reason="relation detected"
    )


    vision_router.gemini_service.verify_mission = Mock(
        return_value=expected_result
    )


    result = vision_router.verify(

        image_bytes=b"test-image",

        mission_type="RELATION",

        decision_condition={

            "target": {

                "subject": "person",

                "object": "dog"

            },

            "constraints": {

                "relation": "next to"

            }

        }

    )


    vision_router.gemini_service.verify_mission.assert_called_once()


    assert result.success is True