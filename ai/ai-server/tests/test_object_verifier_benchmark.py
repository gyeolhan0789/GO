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

from app.services.verifier.object_verifier_service import (
    ObjectVerifierService
)

from app.services.vision.gemini_service import (
    GeminiService
)



logger = logging.getLogger(__name__)




# ==========================
# Dataset
# ==========================


BASE_DIR = Path(__file__).resolve().parent


DATASET_DIR = (
    BASE_DIR /
    "benchmark" /
    "object"
)



CATEGORIES = {

    "pass":
        DATASET_DIR / "pass",

    "negative":
        DATASET_DIR / "negative",

    "non_real":
        DATASET_DIR / "non_real",

    "uncertain":
        DATASET_DIR / "uncertain"

}



TARGET = "flower"



CANDIDATES = [

    "a photo of a real flower",

    "a photo without a flower"

]



# ==========================
# Gemini fallback 확인용
# ==========================
#
# quota 때문에 일부만 테스트
#
# 전체 테스트 시:
#
# TEST_FILES = None
#

TEST_FILES = {

    "real_flower_05.jpg",

    "real_flower_09.jpg",

    "flower_screen.jpg",

    "flower_poster.jpg",

    "flower_sticker.jpg"

}





def load_images():

    dataset = []


    for category, folder in CATEGORIES.items():


        if not folder.exists():

            continue


        for image_path in folder.iterdir():


            if image_path.suffix.lower() in (

                ".jpg",
                ".jpeg",
                ".png"

            ):

                dataset.append(

                    {

                        "category":
                            category,

                        "path":
                            image_path

                    }

                )


    return dataset





def print_separator():

    print(
        "\n--------------------------------\n"
    )





def print_item_result(
    item,
    result,
    source,
    latency
):


    print_separator()


    print(

        f"""
FILE={item["path"].name}

CATEGORY={item["category"]}


RESULT={result.success}


SOURCE={source}


CONFIDENCE={result.confidence:.3f}


REASON={result.reason}


LATENCY={latency:.3f}s
"""

    )





def test_object_verifier_benchmark():


    siglip = SigLIP2Service()


    rule_engine = SigLIPRuleEngine()



    verifier = ObjectVerifierService(

        gemini_service=
            GeminiService()

    )



    dataset = load_images()



    # ==========================
    # Test filter
    # ==========================

    if TEST_FILES is not None:

        dataset = [

            item

            for item in dataset

            if item["path"].name in TEST_FILES

        ]



    assert len(dataset) > 0



    results = []



    gemini_count = 0

    local_real_count = 0

    local_non_real_count = 0

    candidate_fail_count = 0





    for item in dataset:


        start = time.time()



        image = (

            Image.open(
                item["path"]
            )

            .convert(
                "RGB"
            )

        )



        # ==========================
        # 1. SigLIP Candidate
        # ==========================


        prediction = siglip.predict(

            image=image,

            candidates=CANDIDATES

        )



        object_result = (

            rule_engine.create_object_result(

                target=TARGET,

                scores=
                    prediction["scores"]

            )

        )



        print(

            f"""

[SIGLIP]

FILE={item["path"].name}

confidence={object_result.confidence:.3f}

positive={object_result.positive_score:.6f}

negative={object_result.negative_score:.6f}

margin={object_result.margin:.6f}

"""

        )





        # ==========================
        # Candidate Fail
        # ==========================


        if not object_result.detected:


            candidate_fail_count += 1


            latency = (

                time.time()
                -
                start

            )


            results.append(

                {

                    "category":
                        item["category"],

                    "success":
                        False,

                    "source":
                        "SIGLIP_CANDIDATE_FAIL"

                }

            )


            print(

                f"""

SOURCE=SIGLIP_CANDIDATE_FAIL

LATENCY={latency:.3f}s

"""

            )


            continue






        # ==========================
        # Object Verification
        # ==========================


        result = verifier.verify(

            image_bytes=
                item["path"].read_bytes(),

            target=
                TARGET,

            object_result=
                object_result

        )



        latency = (

            time.time()
            -
            start

        )



        source = (

            result.metadata
            .get(
                "decision_source",
                "UNKNOWN"
            )

        )



        if source == "GEMINI_FALLBACK":

            gemini_count += 1


        elif source == "OBJECT_VERIFIER_LOCAL":


            verification = (

                result.metadata
                .get(
                    "verification"
                )

            )


            if verification == "REAL":

                local_real_count += 1


            elif verification == "NON_REAL":

                local_non_real_count += 1





        results.append(

            {

                "category":
                    item["category"],

                "success":
                    result.success,

                "source":
                    source

            }

        )



        print_item_result(

            item,

            result,

            source,

            latency

        )





    # ==========================
    # Summary
    # ==========================


    print(

        """

================================

OBJECT VERIFIER GEMINI FALLBACK BENCHMARK

================================

"""

    )



    category_result = {}



    for r in results:


        category = r["category"]


        if category not in category_result:


            category_result[category] = {

                "total":0,

                "success":0

            }



        category_result[category]["total"] += 1



        if r["success"]:

            category_result[category]["success"] += 1





    total = 0

    correct = 0



    for category, value in category_result.items():


        accuracy = (

            value["success"]

            /

            value["total"]

        )


        print(

            f"""

CATEGORY={category}


TOTAL={value["total"]}


SUCCESS={value["success"]}


FAIL={value["total"] - value["success"]}


ACCURACY={accuracy:.3f}

"""

        )


        total += value["total"]

        correct += value["success"]





    print(

        f"""

================================

ROUTING STATISTICS


LOCAL_REAL={local_real_count}

LOCAL_NON_REAL={local_non_real_count}

GEMINI_FALLBACK={gemini_count}

SIGLIP_CANDIDATE_FAIL={candidate_fail_count}


================================


TOTAL={total}


CORRECT={correct}


OVERALL ACCURACY={correct / total:.3f}


================================

"""

    )



    assert len(results) > 0