import json

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app



client = TestClient(app)



TEST_IMAGE_DIR = (
    Path(__file__)
    .parent
    /
    "test_images"
)




def test_object_mission_api_flower():
    """
    OBJECT Mission API
    Flower PASS 테스트

    Flow:

    POST /mission/verify

        ↓

    ObjectVisionService

        ↓

    SigLIP2

        ↓

    RuleEngine

        ↓

    MissionResponse
    """



    image_path = (
        TEST_IMAGE_DIR
        /
        "yellow_flower.jpg"
    )



    with open(
        image_path,
        "rb"
    ) as image_file:


        response = client.post(

            "/mission/verify",

            files={

                "image": (

                    "yellow_flower.jpg",

                    image_file,

                    "image/jpeg"

                )

            },


            data={

                "mission_type":
                    "OBJECT",


                "decision_condition":
                    json.dumps(
                        {
                            "target": "flower"
                        }
                    )

            }

        )



    print(
        "\n===== FLOWER API RESULT ====="
    )


    print(
        response.status_code
    )


    print(
        response.json()
    )



    assert (
        response.status_code
        ==
        200
    )



    result = response.json()



    assert (
        result["status"]
        ==
        "SUCCESS"
    )


    assert (
        result["reason_code"]
        ==
        "PASS"
    )


    assert (
        result["confidence"]
        >
        0
    )




def test_object_mission_api_dog_pass():
    """
    OBJECT Mission API
    Dog PASS 테스트

    내부적으로는:

    SigLIP2 uncertain

        ↓

    Gemini fallback

        ↓

    PASS

    를 거칠 수 있음.

    API 레벨에서는
    최종 성공 응답만 검증.
    """



    image_path = (
        TEST_IMAGE_DIR
        /
        "dog.jpg"
    )



    with open(
        image_path,
        "rb"
    ) as image_file:


        response = client.post(

            "/mission/verify",

            files={

                "image": (

                    "dog.jpg",

                    image_file,

                    "image/jpeg"

                )

            },


            data={

                "mission_type":
                    "OBJECT",


                "decision_condition":
                    json.dumps(
                        {
                            "target": "dog"
                        }
                    )

            }

        )



    print(
        "\n===== DOG API RESULT ====="
    )


    print(
        response.status_code
    )


    print(
        response.json()
    )



    assert (
        response.status_code
        ==
        200
    )



    result = response.json()



    assert (
        result["status"]
        ==
        "SUCCESS"
    )


    assert (
        result["reason_code"]
        ==
        "PASS"
    )


    assert (
        result["confidence"]
        >=
        0.7
    )




def test_object_mission_api_invalid_condition():
    """
    OBJECT target 누락 테스트
    """



    image_path = (
        TEST_IMAGE_DIR
        /
        "dog.jpg"
    )



    with open(
        image_path,
        "rb"
    ) as image_file:


        response = client.post(

            "/mission/verify",

            files={

                "image": (

                    "dog.jpg",

                    image_file,

                    "image/jpeg"

                )

            },


            data={

                "mission_type":
                    "OBJECT",


                "decision_condition":
                    json.dumps({})
            }

        )



    print(
        "\n===== INVALID CONDITION RESULT ====="
    )


    print(
        response.status_code
    )


    print(
        response.json()
    )



    assert (
        response.status_code
        ==
        400
    )


    assert (
        "OBJECT target 조건이 필요합니다."
        in
        response.json()["detail"]
    )