import io

import pytest

from PIL import Image

from app.services.vision.object_vision_service import (
    ObjectVisionService
)

from app.domain.mission_result import (
    ReasonCode
)



@pytest.fixture
def object_service():

    return ObjectVisionService()



def load_image_bytes(
    image_name: str
):

    image_path = (
        "tests/test_images/"
        +
        image_name
    )


    image = (
        Image.open(
            image_path
        )
        .convert("RGB")
    )


    buffer = io.BytesIO()


    image.save(
        buffer,
        format="JPEG"
    )


    return buffer.getvalue()



def test_object_vision_flower(
    object_service
):
    """
    꽃 객체 존재 판단 통합 테스트

    FLOW:
    SigLIP2
    -> Rule Engine
    -> AIResult
    """


    image_bytes = load_image_bytes(
        "yellow_flower.jpg"
    )


    decision_condition = {

        "target":
            "flower"

    }



    result = (
        object_service.verify(
            image_bytes=image_bytes,
            decision_condition=decision_condition
        )
    )



    print("\n===== FLOWER OBJECT RESULT =====")


    print(
        "success:",
        result.success
    )


    print(
        "reason_code:",
        result.reason_code
    )


    print(
        "confidence:",
        result.confidence
    )


    print(
        "reason:",
        result.reason
    )


    print(
        "metadata:",
        result.metadata
    )



    assert isinstance(
        result.success,
        bool
    )


    assert result.reason_code in [

        ReasonCode.PASS,

        ReasonCode.OBJECT_UNCERTAIN,

        ReasonCode.OBJECT_NOT_FOUND

    ]



def test_object_vision_dog(
    object_service
):
    """
    강아지 객체 존재 판단 통합 테스트
    """


    image_bytes = load_image_bytes(
        "dog.jpg"
    )


    decision_condition = {

        "target":
            "dog"

    }



    result = (
        object_service.verify(
            image_bytes=image_bytes,
            decision_condition=decision_condition
        )
    )



    print("\n===== DOG OBJECT RESULT =====")


    print(
        "success:",
        result.success
    )


    print(
        "reason_code:",
        result.reason_code
    )


    print(
        "confidence:",
        result.confidence
    )


    print(
        "reason:",
        result.reason
    )


    print(
        "metadata:",
        result.metadata
    )



    assert isinstance(
        result.success,
        bool
    )


    assert result.reason_code in [

        ReasonCode.PASS,

        ReasonCode.OBJECT_UNCERTAIN,

        ReasonCode.OBJECT_NOT_FOUND

    ]



def test_object_vision_missing_target(
    object_service
):
    """
    target 없는 잘못된 요청 검증
    """


    image_bytes = load_image_bytes(
        "dog.jpg"
    )


    decision_condition = {}



    with pytest.raises(
        ValueError
    ):

        object_service.verify(
            image_bytes=image_bytes,
            decision_condition=decision_condition
        )