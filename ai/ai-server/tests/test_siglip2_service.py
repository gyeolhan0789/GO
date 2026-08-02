import time
from pathlib import Path

from PIL import Image

from app.services.vision.siglip2_service import SigLIP2Service



def test_siglip2_predict():

    # ==========================
    # Service 초기화
    # (모델 로딩 시간 측정 제외)
    # ==========================

    service = SigLIP2Service()


    image_path = (
        Path(__file__)
        .parent
        .parent
        / "test_images"
        / "02_yellowflower_pass.jpg"
    )


    image = Image.open(
        image_path
    )


    candidates = [
        "a flower",
        "a tree",
        "a dog",
        "a person"
    ]


    # ==========================
    # Warm-up
    # 첫 inference 제외
    # ==========================

    service.predict(
        image,
        candidates
    )


    # ==========================
    # 실제 inference latency 측정
    # ==========================

    inference_times = []

    result = None


    TEST_COUNT = 5


    for _ in range(TEST_COUNT):

        start = time.perf_counter()


        result = service.predict(
            image,
            candidates
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
    # 결과 출력
    # ==========================

    print("\n===== SigLIP2 Result =====")


    print(
        "Top Label:",
        result["top_label"]
    )


    print(
        "Confidence:",
        result["confidence"]
    )


    print(
        "\nScores:"
    )


    for label, score in (
        result["scores"]
        .items()
    ):
        print(
            f"{label}: {score:.4f}"
        )


    print("\n===== Latency =====")


    for idx, latency in enumerate(
        inference_times,
        start=1
    ):
        print(
            f"{idx}회: {latency:.2f}ms"
        )


    print(
        f"\nAverage: {avg_latency:.2f}ms"
    )


    # ==========================
    # 기본 검증
    # ==========================

    assert (
        result["top_label"]
        in candidates
    )


    assert (
        0 <= result["confidence"] <= 1
    )