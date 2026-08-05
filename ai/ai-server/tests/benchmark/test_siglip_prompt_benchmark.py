import statistics
from pathlib import Path

from PIL import Image

from app.services.vision.siglip2_service import SigLIP2Service


DATASET = {
    "pass": (
        Path(__file__).parent.parent
        / "benchmark"
        / "object"
        / "pass"
    ),
    "negative": (
        Path(__file__).parent.parent
        / "benchmark"
        / "object"
        / "fail"
        / "negative"
    ),
    "non_real": (
        Path(__file__).parent.parent
        / "benchmark"
        / "object"
        / "fail"
        / "non_real"
    ),
    "uncertain": (
        Path(__file__).parent.parent
        / "benchmark"
        / "object"
        / "uncertain"
    ),
}


PROMPT_CASES = [

    (
        "a photo of a flower",
        "there is no flower in the image",
    ),

    (
        "a photo containing a flower",
        "a photo without a flower",
    ),

    (
        "a real flower",
        "not a real flower",
    ),

    (
        "a photograph of a flower",
        "not a photograph of a flower",
    ),

    (
        "a real photo of a flower",
        "not a real photo of a flower",
    ),

    (
        "a natural flower",
        "not a natural flower",
    ),

    (
        "a close-up photo of a flower",
        "not a close-up photo of a flower",
    ),
]


def evaluate_prompt(
    service: SigLIP2Service,
    positive_prompt: str,
    negative_prompt: str,
):

    positive_scores = []
    negative_scores = []
    margins = []
    ratios = []

    category_result = {}

    for category, folder in DATASET.items():

        files = sorted(folder.glob("*"))

        category_margin = []
        category_ratio = []

        for image_path in files:

            image = (
                Image.open(image_path)
                .convert("RGB")
            )

            result = service.predict(
                image=image,
                candidates=[
                    positive_prompt,
                    negative_prompt,
                ],
            )

            pos = result["scores"][positive_prompt]
            neg = result["scores"][negative_prompt]

            positive_scores.append(pos)
            negative_scores.append(neg)

            margin = pos - neg
            ratio = pos / max(neg, 1e-6)

            margins.append(margin)
            ratios.append(ratio)

            category_margin.append(margin)
            category_ratio.append(ratio)

        category_result[category] = {
            "margin": statistics.mean(category_margin),
            "ratio": statistics.mean(category_ratio),
        }

    return {
        "positive_prompt": positive_prompt,
        "negative_prompt": negative_prompt,
        "avg_positive": statistics.mean(positive_scores),
        "avg_negative": statistics.mean(negative_scores),
        "avg_margin": statistics.mean(margins),
        "avg_ratio": statistics.mean(ratios),
        "category": category_result,
    }


def test_siglip_prompt_benchmark():

    service = SigLIP2Service()

    results = []

    for positive_prompt, negative_prompt in PROMPT_CASES:

        results.append(
            evaluate_prompt(
                service,
                positive_prompt,
                negative_prompt,
            )
        )

    print()
    print("=" * 90)
    print("PROMPT BENCHMARK")
    print("=" * 90)

    for result in results:

        print()
        print("-" * 90)
        print("Positive :", result["positive_prompt"])
        print("Negative :", result["negative_prompt"])

        print(f"Avg Positive : {result['avg_positive']:.6f}")
        print(f"Avg Negative : {result['avg_negative']:.6f}")
        print(f"Avg Margin   : {result['avg_margin']:.6f}")
        print(f"Avg Ratio    : {result['avg_ratio']:.2f}")

        print()

        for category, value in result["category"].items():

            print(
                f"{category:10s}"
                f" margin={value['margin']:.6f}"
                f" ratio={value['ratio']:.2f}"
            )

    print()
    print("=" * 90)
    print("RANKING (PASS - NON_REAL)")
    print("=" * 90)

    ranking = sorted(
        results,
        key=lambda x: (
            x["category"]["pass"]["margin"]
            - x["category"]["non_real"]["margin"]
        ),
        reverse=True,
    )

    for idx, result in enumerate(ranking, start=1):

        score = (
            result["category"]["pass"]["margin"]
            - result["category"]["non_real"]["margin"]
        )

        print(
            f"{idx:2d}. {result['positive_prompt']}"
        )
        print(
            f"    separation={score:.6f}"
        )

    best = ranking[0]

    print()
    print("=" * 90)
    print("BEST PROMPT")
    print("=" * 90)
    print(best["positive_prompt"])
    print(best["negative_prompt"])

    assert len(results) == len(PROMPT_CASES)