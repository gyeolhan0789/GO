import time

from pathlib import Path

from PIL import Image

from app.services.vision.siglip2_service import (
    SigLIP2Service
)



def run_siglip_test(
    service,
    image_name: str,
    target: str
):


    image_path = (
        Path(__file__)
        .parent
        / "test_images"
        / image_name
    )


    image = (
        Image.open(image_path)
        .convert("RGB")
    )



    # ==========================
    # Positive / Negative Prompt
    # ==========================

    positive_prompt = (
        f"a photo of a {target}"
    )


    negative_prompt = (
        f"a photo without a {target}"
    )

    candidates = [

        positive_prompt,

        negative_prompt

    ]



    # ==========================
    # Warm-up
    # ==========================

    service.predict(
        image=image,
        candidates=candidates
    )



    # ==========================
    # Latency Test
    # ==========================

    inference_times = []

    result = None


    TEST_COUNT = 5



    for _ in range(TEST_COUNT):

        start = time.perf_counter()


        result = service.predict(
            image=image,
            candidates=candidates
        )


        end = time.perf_counter()


        latency_ms = (
            end - start
        ) * 1000


        inference_times.append(
            latency_ms
        )



    avg_latency = (
        sum(inference_times)
        /
        len(inference_times)
    )



    # ==========================
    # Score Extract
    # ==========================

    positive_score = (
        result["scores"]
        [positive_prompt]
    )


    negative_score = (
        result["scores"]
        [negative_prompt]
    )


    margin = (
        positive_score
        -
        negative_score
    )



    ratio = (
        positive_score
        /
        max(
            negative_score,
            1e-6
        )
    )



    # ==========================
    # Result Output
    # ==========================

    print(
        f"\n===== {target.upper()} Result ====="
    )


    print(
        "Image:",
        image_name
    )


    print(
        "\nPositive Prompt:"
    )


    print(
        f"{positive_prompt}: {positive_score:.6f}"
    )


    print(
        "\nNegative Prompt:"
    )


    print(
        f"{negative_prompt}: {negative_score:.6f}"
    )


    print(
        "\nMargin:"
    )


    print(
        f"{margin:.6f}"
    )


    print(
        "\nPositive / Negative Ratio:"
    )


    print(
        f"{ratio:.2f}"
    )



    print(
        "\nLatency:"
    )


    for idx, latency in enumerate(
        inference_times,
        start=1
    ):

        print(
            f"{idx}회: {latency:.2f}ms"
        )



    print(
        f"Average: {avg_latency:.2f}ms"
    )



    # ==========================
    # Validation
    # ==========================

    assert (
        "scores"
        in result
    )


    assert (
        positive_prompt
        in result["scores"]
    )


    assert (
        negative_prompt
        in result["scores"]
    )


    assert (
        0
        <=
        positive_score
        <=
        1
    )


    assert (
        0
        <=
        negative_score
        <=
        1
    )


    assert (
        margin
        ==
        positive_score - negative_score
    )


    assert (
        result["latency_ms"]
        >
        0
    )


    return {

        "positive_score": positive_score,

        "negative_score": negative_score,

        "margin": margin,

        "ratio": ratio,

        "raw": result

    }




def test_siglip2_predict():


    # ==========================
    # Service Initialize
    # ==========================

    service = SigLIP2Service()



    # ==========================
    # Flower Case
    # ==========================

    flower_result = run_siglip_test(

        service=service,

        image_name="yellow_flower.jpg",

        target="flower"

    )



    assert (
        flower_result["positive_score"]
        >
        flower_result["negative_score"]
    )



    # ==========================
    # Dog Case
    # ==========================

    dog_result = run_siglip_test(

        service=service,

        image_name="dog.jpg",

        target="dog"

    )



    assert (
        dog_result["positive_score"]
        >
        dog_result["negative_score"]
    )