import logging
import time
from pathlib import Path

from PIL import Image

from app.services.vision.siglip2_service import (
    SigLIP2Service
)


logger = logging.getLogger(__name__)


# ==========================
# Benchmark Dataset
# ==========================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)


DATASET_PATH = (
    BASE_DIR
    /
    "benchmark"
    /
    "object"
)


CATEGORIES = {

    "pass":
        DATASET_PATH / "pass",

    "negative":
        DATASET_PATH / "fail" / "negative",

    "non_real":
        DATASET_PATH / "fail" / "non_real",

    "uncertain":
        DATASET_PATH / "uncertain"
}



# ==========================
# OBJECT Mission
# ==========================

TARGET = "flower"


POSITIVE_LABEL = (
    "a photo containing a flower"
)


NEGATIVE_LABEL = (
    "a photo without a flower"
)

CANDIDATES = [

    POSITIVE_LABEL,

    NEGATIVE_LABEL

]



# ==========================
# Threshold 후보
# ==========================

THRESHOLDS = [

    0.55,
    0.60,
    0.65,
    0.70,
    0.75

]



# ==========================
# Dataset Loader
# ==========================

def load_images():

    images = []


    for category, folder in CATEGORIES.items():


        if not folder.detected():

            logger.warning(
                f"[Dataset Missing] {folder}"
            )

            continue



        for image_path in folder.iterdir():


            if image_path.suffix.lower() not in [
                ".jpg",
                ".jpeg",
                ".png"
            ]:
                continue


            images.append(
                {
                    "category": category,
                    "path": image_path
                }
            )


    logger.info(
        f"[Dataset Loaded] {len(images)} images"
    )


    return images



# ==========================
# Confidence 계산
# ==========================

def calculate_confidence(
    prediction: dict
):
    """
    SigLIP classification confidence

    confidence =
        selected class probability


    예)

    flower
    positive 0.88
    negative 0.12

    confidence = 0.88


    non flower
    positive 0.05
    negative 0.95

    confidence = 0.95
    """


    scores = prediction["scores"]


    positive = (
        scores[POSITIVE_LABEL]
    )


    negative = (
        scores[NEGATIVE_LABEL]
    )


    confidence = max(
        positive,
        negative
    )


    return round(
        confidence,
        3
    )


# ==========================
# RuleEngine Simulation
# ==========================

def decide_result(
    prediction: dict,
    threshold: float
):


    confidence = (
        calculate_confidence(
            prediction
        )
    )


    top_label = (
        prediction["top_label"]
    )


    if confidence < threshold:

        return "UNCERTAIN"



    if top_label == POSITIVE_LABEL:

        return "PASS"



    if top_label == NEGATIVE_LABEL:

        return "FAIL"



    return "UNCERTAIN"


# ==========================
# Benchmark
# ==========================

def test_siglip_threshold_benchmark():


    service = SigLIP2Service()


    dataset = load_images()


    assert len(dataset) > 0, (
        "benchmark dataset empty"
    )



    logger.info(
        f"""
[Benchmark]
images={len(dataset)}
"""
    )



    results = []



    for item in dataset:


        image = (
            Image.open(
                item["path"]
            )
            .convert(
                "RGB"
            )
        )


        start = time.perf_counter()


        prediction = (
            service.predict(
                image=image,
                candidates=CANDIDATES
            )
        )


        latency = (
            time.perf_counter()
            -
            start
        ) * 1000



        confidence = (
            calculate_confidence(
                prediction
            )
        )



        row = {

            "category":
                item["category"],


            "file":
                item["path"].name,


            "top_label":
                prediction["top_label"],


            "confidence":
                confidence,


            "latency_ms":
                round(
                    latency,
                    2
                ),


            "scores":
                prediction["scores"]

        }



        results.append(row)




    # ==========================
    # Threshold 평가
    # ==========================


    for threshold in THRESHOLDS:


        logger.info(
            f"""
            ========== Threshold {threshold} ==========
            """
        )



        stats = {

            category:
            {
                "total":0,
                "pass":0,
                "fail":0,
                "uncertain":0

            }

            for category in CATEGORIES

        }




        for row in results:



            prediction = {

                "top_label":
                    row["top_label"],

                "scores":
                    row["scores"]

            }



            result = decide_result(
                prediction,
                threshold
            )



            category = (
                row["category"]
            )



            stats[category]["total"] += 1



            if result == "PASS":

                stats[category]["pass"] += 1


            elif result == "FAIL":

                stats[category]["fail"] += 1


            else:

                stats[category]["uncertain"] += 1




        for category, value in stats.items():

            logger.info(
                f"""
                {category}
                total={value['total']}
                PASS={value['pass']}
                FAIL={value['fail']}
                UNCERTAIN={value['uncertain']}
                """
            )



    # ==========================
    # Detail
    # ==========================


    logger.info(
        """
        ========== Detail ==========
        """
    )


    for row in results:

        logger.info(
            row
        )