import io
import time
import logging

from unittest.mock import Mock

from PIL import Image

from app.services.vision.object_vision_service import (
    ObjectVisionService
)

from app.domain.ai_result import AIResult


logger = logging.getLogger(__name__)



def create_image_bytes():

    image = Image.new(
        "RGB",
        (224,224),
        color="white"
    )

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="JPEG"
    )

    return buffer.getvalue()



def test_object_gemini_fallback_latency():


    service = ObjectVisionService()



    # ==========================
    # SigLIP uncertain 상황 생성
    # ==========================

    service.siglip_service.predict = Mock(
        return_value={

            "top_label":
                "a photo of a flower",

            "confidence":
                0.55,

            "scores": {

                "a photo of a flower":
                    0.55,

                "not a flower":
                    0.45
            },

            "latency_ms":
                200
        }
    )



    image_bytes = create_image_bytes()



    start = time.perf_counter()



    result = service.verify(
        image_bytes=image_bytes,

        decision_condition={
            "target":
                "flower"
        }
    )



    latency_ms = (
        time.perf_counter()
        -
        start
    ) * 1000



    logger.info(
        "\n"
        "[OBJECT Gemini Fallback Latency]\n"
        "{\n"
        f" 'latency_ms': {latency_ms:.2f},\n"
        f" 'success': {result.success},\n"
        f" 'confidence': {result.confidence:.2f},\n"
        f" 'reason_code': '{result.reason_code}'\n"
        "}"
    )



    assert result is not None