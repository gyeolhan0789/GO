import logging
import time

from pathlib import Path

from PIL import Image


from app.services.vision.siglip2_service import (
    SigLIP2Service
)


from app.services.rule_engine.siglip_rule_engine import (
    SigLIPRuleEngine
)


logger = logging.getLogger(__name__)





# ==========================
# Dataset
# ==========================


BASE_DIR = Path(__file__).resolve().parent


DATASET_PATH = (
    BASE_DIR
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
# TARGET
# ==========================


TARGET = "flower"





# ==========================
# PROMPT
# ==========================


POSITIVE_LABEL = (

    f"a photo of a real {TARGET}"

)



NEGATIVE_LABEL = (

    f"a photo without a {TARGET}"

)



CANDIDATES = [

    POSITIVE_LABEL,

    NEGATIVE_LABEL

]





# ==========================
# Loader
# ==========================


def load_images():


    images = []


    for category, folder in CATEGORIES.items():


        if not folder.exists():

            logger.warning(

                "[Dataset Missing] %s",

                folder

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

                    "category":
                        category,

                    "path":
                        image_path

                }

            )


    logger.info(

        "[Dataset Loaded] %d images",

        len(images)

    )


    return images





# ==========================
# Benchmark
# ==========================


def test_siglip_object_candidate_benchmark():


    siglip_service = (
        SigLIP2Service()
    )


    rule_engine = (
        SigLIPRuleEngine()
    )



    dataset = load_images()


    assert len(dataset) > 0



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
            siglip_service.predict(
                image=image,
                candidates=CANDIDATES
            )
        )



        latency = (

            time.perf_counter()

            -

            start

        ) * 1000




        scores = (
            prediction["scores"]
        )




        # ==========================
        # SigLIP Rule Engine
        # ==========================


        candidate = (
            rule_engine.create_object_result(

                target=TARGET,

                scores=scores

            )

        )




        results.append(

            {

                "category":
                    item["category"],


                "file":
                    item["path"].name,


                "positive":
                    candidate.positive_score,


                "negative":
                    candidate.negative_score,


                "margin":
                    candidate.margin,


                "detected":
                    candidate.detected,


                "confidence":
                    candidate.confidence,


                "latency":
                    latency

            }

        )





    # ==========================
    # Summary
    # ==========================


    logger.info(
        """
================================

SIGLIP OBJECT CANDIDATE BENCHMARK


TARGET:
%s


IMAGE COUNT:
%s


================================
""",

        TARGET,

        len(results)

    )





    stats = {}



    for category in CATEGORIES:


        stats[category] = {

            "TOTAL": 0,

            "DETECTED": 0,

            "NOT_DETECTED": 0

        }




    for row in results:


        category = row["category"]


        stats[category]["TOTAL"] += 1



        if row["detected"]:

            stats[category]["DETECTED"] += 1


        else:

            stats[category]["NOT_DETECTED"] += 1





    for category, value in stats.items():


        logger.info(

            """
%s

TOTAL=%d

DETECTED=%d

NOT_DETECTED=%d

""",

            category,

            value["TOTAL"],

            value["DETECTED"],

            value["NOT_DETECTED"]

        )






    # ==========================
    # Detail
    # ==========================


    logger.info(
        """
================================
DETAIL
================================
"""
    )



    for row in results:


        logger.info(

            """
%s

category=%s


detected=%s


confidence=%.3f


positive=%.6f


negative=%.6f


margin=%.6f


latency=%.2fms

""",

            row["file"],

            row["category"],

            row["detected"],

            row["confidence"],

            row["positive"],

            row["negative"],

            row["margin"],

            row["latency"]

        )