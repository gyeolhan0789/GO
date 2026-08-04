import io
import time

from PIL import Image

from app.services.vision.object_vision_service import (
    ObjectVisionService
)


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



def test_object_pipeline_latency():

    service = ObjectVisionService()


    image_bytes = create_image_bytes()


    # warm-up
    service.verify(
        image_bytes=image_bytes,
        decision_condition={
            "target":"flower"
        }
    )


    start = time.perf_counter()


    result = service.verify(
        image_bytes=image_bytes,
        decision_condition={
            "target":"flower"
        }
    )


    latency_ms = (
        time.perf_counter()
        -
        start
    ) * 1000


    print(
        f"\nOBJECT Pipeline Latency: {latency_ms:.2f}ms"
    )


    assert result is not None