import time

from PIL import Image

from app.services.vision.siglip2_service import (
    SigLIP2Service
)


def create_test_image():

    return Image.new(
        "RGB",
        (224, 224),
        color="white"
    )


def test_siglip2_latency():

    service = SigLIP2Service()

    image = create_test_image()

    candidates = [
        "a photo of a flower",
        "not a flower"
    ]


    # warm-up
    service.predict(
        image=image,
        candidates=candidates
    )


    latency_list = []


    for _ in range(10):

        start = time.perf_counter()


        service.predict(
            image=image,
            candidates=candidates
        )


        latency = (
            time.perf_counter()
            -
            start
        ) * 1000


        latency_list.append(
            latency
        )


    avg_latency = (
        sum(latency_list)
        /
        len(latency_list)
    )


    print(
        f"\nSigLIP2 Avg Latency: {avg_latency:.2f}ms"
    )


    assert avg_latency < 3000