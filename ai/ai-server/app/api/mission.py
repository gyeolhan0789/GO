import json
import traceback

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException
)


from app.services.vision.vision_router import VisionRouter

from app.services.vision.image_quality_service import (
    ImageQualityService
)

from app.validators.mission_validator import (
    MissionValidator
)



router = APIRouter(
    prefix="/mission",
    tags=["Mission"]
)



# ==========================
# Service
# ==========================

vision_router = VisionRouter()

image_quality_service = ImageQualityService()



ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png"
}


SUPPORTED_MISSION_TYPES = {
    "OBJECT",
    "ATTRIBUTE",
    "RELATION"
}



@router.get("/test")
def test():

    return {
        "result": "AI server is running"
    }



@router.post("/verify")
async def verify_mission(

    image: UploadFile = File(...),

    mission_type: str = Form(...),

    decision_condition: str = Form(...)

):


    # ==========================
    # Mission Type Normalize
    # ==========================

    mission_type = mission_type.upper()


    if mission_type not in SUPPORTED_MISSION_TYPES:

        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 mission_type입니다."
        )



    # ==========================
    # Image Validation
    # ==========================

    if not image.filename:

        raise HTTPException(
            status_code=400,
            detail="이미지를 선택해주세요."
        )


    extension = (
        image.filename
        .split(".")[-1]
        .lower()
    )


    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail="jpg, jpeg, png 파일만 업로드 가능합니다."
        )


    image_bytes = await image.read()


    if len(image_bytes) == 0:

        raise HTTPException(
            status_code=400,
            detail="빈 이미지입니다."
        )



    # ==========================
    # Image Quality Check
    # ==========================

    image_quality = image_quality_service.check(
        image_bytes
    )


    if image_quality is not None:

        return MissionValidator.validate_image_quality(
            image_quality
        )



    # ==========================
    # Decision Condition Parse
    # ==========================

    try:

        decision_condition = json.loads(
            decision_condition
        )


    except Exception:

        raise HTTPException(
            status_code=400,
            detail="decision_condition은 JSON 형식이어야 합니다."
        )



    # ==========================
    # Vision Pipeline
    #
    # OBJECT:
    #   SigLIP2
    #       ↓
    #   RuleEngine
    #       ↓
    #   ObjectVerifier
    #
    # ATTRIBUTE:
    #   Gemini
    #
    # RELATION:
    #   Gemini
    #
    # ==========================

    try:

        ai_result = vision_router.verify(

            image_bytes=image_bytes,

            mission_type=mission_type,

            decision_condition=decision_condition

        )


        return MissionValidator.validate(
            ai_result
        )



    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


    except RuntimeError as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    except Exception:

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="AI 서버 내부 오류가 발생했습니다."
        )