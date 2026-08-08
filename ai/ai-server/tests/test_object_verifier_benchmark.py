import logging
import time
from pathlib import Path

from PIL import Image

from app.services.vision.siglip2_service import SigLIP2Service
from app.services.rule_engine.siglip_rule_engine import SigLIPRuleEngine
from app.services.verifier.object_verifier_service import ObjectVerifierService
from app.services.vision.gemini_service import GeminiService


logger = logging.getLogger(__name__)


# ==========================
# Dataset
# ==========================

BASE_DIR = Path(__file__).resolve().parent

DATASET_DIR = (
    BASE_DIR
    / "benchmark"
    / "object"
)

CATEGORIES = {
    "pass": DATASET_DIR / "pass",
    "negative": DATASET_DIR / "fail" / "negative",
    "non_real": DATASET_DIR / "fail" / "non_real",
    "uncertain": DATASET_DIR / "uncertain",
}


# ==========================
# Ground Truth (기대 결과)
# ==========================
# pass, uncertain -> 최종 통과(True)되어야 정답
# negative, non_real -> 차단(False)되어야 정답
EXPECTED_SUCCESS = {
    "pass": True,
    "uncertain": True,
    "negative": False,
    "non_real": False,
}


# ==========================
# OBJECT Mission
# ==========================

TARGET = "flower"

CANDIDATES = [
    "a photo of a real flower",
    "a photo without a flower",
]


# ==========================
# Test Filter
# ==========================

TEST_FILES = None


# ==========================
# Dataset Loader
# ==========================

def load_images():
    dataset = []

    for category, folder in CATEGORIES.items():

        if not folder.exists():
            logger.warning(
                f"[Dataset Missing] category={category}, path={folder}"
            )
            continue

        for image_path in folder.iterdir():

            if image_path.suffix.lower() not in (
                ".jpg",
                ".jpeg",
                ".png",
            ):
                continue

            dataset.append(
                {
                    "category": category,
                    "path": image_path,
                }
            )

    logger.info(
        f"[Dataset Loaded] total={len(dataset)}"
    )

    for category, folder in CATEGORIES.items():

        count = sum(
            1
            for item in dataset
            if item["category"] == category
        )

        logger.info(
            f"[Dataset] {category}={count}"
        )

    return dataset


# ==========================
# Item Result Logger
# ==========================

def log_item_result(
    item,
    result,
    source,
    latency,
):
    logger.info(
        "\n"
        "--------------------------------\n"
        "[VERIFICATION RESULT]\n"
        f"FILE={item['path'].name}\n"
        f"CATEGORY={item['category']}\n"
        f"RESULT={result.success}\n"
        f"SOURCE={source}\n"
        f"CONFIDENCE={result.confidence:.3f}\n"
        f"REASON={result.reason}\n"
        f"LATENCY={latency:.3f}s\n"
        "--------------------------------"
    )


# ==========================
# Benchmark
# ==========================

def test_object_verifier_benchmark():

    logger.info(
        "\n"
        "========================================\n"
        "OBJECT VERIFIER BENCHMARK START\n"
        "========================================"
    )

    siglip = SigLIP2Service()

    rule_engine = SigLIPRuleEngine()

    verifier = ObjectVerifierService(
        gemini_service=GeminiService()
    )

    dataset = load_images()

    # ==========================
    # Test Filter
    # ==========================

    if TEST_FILES is not None:

        dataset = [
            item
            for item in dataset
            if item["path"].name in TEST_FILES
        ]

        logger.info(
            f"[Test Filter] selected={len(dataset)}"
        )

    else:

        logger.info(
            "[Test Filter] ALL DATASET"
        )

    assert len(dataset) > 0, (
        "Benchmark dataset is empty"
    )

    # ==========================
    # Results
    # ==========================

    results = []

    gemini_count = 0
    local_real_count = 0
    local_non_real_count = 0
    candidate_fail_count = 0

    total_latency = 0.0

    # ==========================
    # Per Image
    # ==========================

    for index, item in enumerate(dataset, start=1):

        logger.info(
            "\n"
            "========================================\n"
            f"[{index}/{len(dataset)}] "
            f"{item['path'].name}\n"
            f"CATEGORY={item['category']}\n"
            "========================================"
        )

        start = time.perf_counter()

        image = (
            Image.open(
                item["path"]
            )
            .convert("RGB")
        )

        # ==========================
        # 1. SigLIP Candidate
        # ==========================

        prediction = siglip.predict(
            image=image,
            candidates=CANDIDATES,
        )

        object_result = (
            rule_engine.create_object_result(
                target=TARGET,
                scores=prediction["scores"],
            )
        )

        logger.info(
            "\n"
            "[SIGLIP CANDIDATE]\n"
            f"FILE={item['path'].name}\n"
            f"CONFIDENCE={object_result.confidence:.3f}\n"
            f"POSITIVE={object_result.positive_score:.6f}\n"
            f"NEGATIVE={object_result.negative_score:.6f}\n"
            f"MARGIN={object_result.margin:.6f}\n"
            f"DETECTED={object_result.detected}"
        )

        # ==========================
        # Candidate Fail
        # ==========================

        if not object_result.detected:

            candidate_fail_count += 1

            latency = (
                time.perf_counter()
                - start
            )

            total_latency += latency

            results.append(
                {
                    "category": item["category"],
                    "file": item["path"].name,
                    "success": False,
                    "source": "SIGLIP_CANDIDATE_FAIL",
                    "latency": latency,
                }
            )

            logger.info(
                "\n"
                "[SIGLIP CANDIDATE FAIL]\n"
                f"FILE={item['path'].name}\n"
                "SOURCE=SIGLIP_CANDIDATE_FAIL\n"
                f"LATENCY={latency:.3f}s"
            )

            continue

        # ==========================
        # 2. Object Verification
        # ==========================

        result = verifier.verify(
            image_bytes=item["path"].read_bytes(),
            target=TARGET,
            object_result=object_result,
        )

        latency = (
            time.perf_counter()
            - start
        )

        total_latency += latency

        source = (
            result.metadata.get(
                "decision_source",
                "UNKNOWN",
            )
        )

        # ==========================
        # Routing Statistics
        # ==========================

        if source == "GEMINI_FALLBACK":

            gemini_count += 1

        elif source == "OBJECT_VERIFIER_LOCAL":

            verification = (
                result.metadata.get(
                    "verification"
                )
            )

            if verification == "REAL":
                local_real_count += 1

            elif verification == "NON_REAL":
                local_non_real_count += 1

        # ==========================
        # Save Result
        # ==========================

        results.append(
            {
                "category": item["category"],
                "file": item["path"].name,
                "success": result.success,
                "source": source,
                "verification": result.metadata.get(
                    "verification"
                ),
                "confidence": result.confidence,
                "latency": latency,
            }
        )

        log_item_result(
            item=item,
            result=result,
            source=source,
            latency=latency,
        )

    # ==========================
    # Summary
    # ==========================

    logger.info(
        "\n"
        "========================================\n"
        "OBJECT VERIFIER BENCHMARK SUMMARY\n"
        "========================================"
    )

    category_result = {}

    for result in results:

        category = result["category"]
        expected = EXPECTED_SUCCESS.get(category, True)
        is_correct = (result["success"] == expected)

        if category not in category_result:

            category_result[category] = {
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "success": 0,
            }

        category_result[category]["total"] += 1

        if is_correct:
            category_result[category]["correct"] += 1
        else:
            category_result[category]["incorrect"] += 1

        if result["success"]:
            category_result[category]["success"] += 1

    total = 0
    correct_total = 0

    # ==========================
    # Category Statistics
    # ==========================

    for category, value in category_result.items():

        accuracy = (
            value["correct"]
            / value["total"]
            if value["total"] > 0
            else 0.0
        )

        logger.info(
            "\n"
            f"[CATEGORY={category}]\n"
            f"TOTAL={value['total']}\n"
            f"CORRECT={value['correct']}\n"
            f"INCORRECT={value['incorrect']}\n"
            f"ACCURACY={accuracy:.3f}"
        )

        total += value["total"]
        correct_total += value["correct"]

    # ==========================
    # Non-real False Positive (전체 데이터셋 기준)
    # ==========================

    non_real_total = (
        category_result
        .get("non_real", {})
        .get("total", 0)
    )

    non_real_false_positive = (
        category_result
        .get("non_real", {})
        .get("success", 0)
    )

    if non_real_total > 0:

        non_real_fpr = (
            non_real_false_positive
            / non_real_total
        )

        logger.info(
            "\n"
            "[NON-REAL FALSE POSITIVE (OVERALL)]\n"
            f"TOTAL={non_real_total}\n"
            f"FALSE_POSITIVE={non_real_false_positive}\n"
            f"FALSE_POSITIVE_RATE={non_real_fpr:.3f}"
        )

    # ==========================
    # Non-real False Positive (Router 진입 대상 기준)
    # ==========================

    router_non_real_items = [
        r for r in results
        if r["category"] == "non_real" and r["source"] != "SIGLIP_CANDIDATE_FAIL"
    ]
    router_non_real_total = len(router_non_real_items)
    router_non_real_fp = sum(
        1 for r in router_non_real_items if r["success"] is True
    )

    if router_non_real_total > 0:

        router_non_real_fpr = (
            router_non_real_fp
            / router_non_real_total
        )

        logger.info(
            "\n"
            "[NON-REAL FALSE POSITIVE (STAGE 2 ROUTER ENTERED)]\n"
            f"ROUTER_ENTERED_TOTAL={router_non_real_total}\n"
            f"FALSE_POSITIVE={router_non_real_fp}\n"
            f"ROUTER_FALSE_POSITIVE_RATE={router_non_real_fpr:.3f}"
        )

    # ==========================
    # Overall Statistics
    # ==========================

    overall_accuracy = (
        correct_total / total
        if total > 0
        else 0.0
    )

    average_latency = (
        total_latency / total
        if total > 0
        else 0.0
    )

    logger.info(
        "\n"
        "========================================\n"
        "ROUTING STATISTICS\n"
        "========================================\n"
        f"LOCAL_REAL={local_real_count}\n"
        f"LOCAL_NON_REAL={local_non_real_count}\n"
        f"GEMINI_FALLBACK={gemini_count}\n"
        f"SIGLIP_CANDIDATE_FAIL={candidate_fail_count}\n"
        "\n"
        "========================================\n"
        "OVERALL STATISTICS\n"
        "========================================\n"
        f"TOTAL={total}\n"
        f"CORRECT={correct_total}\n"
        f"INCORRECT={total - correct_total}\n"
        f"OVERALL_ACCURACY={overall_accuracy:.3f}\n"
        f"AVERAGE_LATENCY={average_latency:.3f}s\n"
        "========================================"
    )

    assert len(results) > 0