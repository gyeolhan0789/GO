import json
import traceback

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException
)

from app.prompts.prompt_builder import PromptBuilder
from app.services.vision.gemini_service import GeminiService
from app.services.vision.image_quality_service import ImageQualityService
from app.validators.mission_validator import MissionValidator
from app.mappers.reason_mapper import ReasonMapper


router = APIRouter(
    prefix="/mission",
    tags=["Mission"]
)

service = GeminiService()
image_quality_service = ImageQualityService()

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png"
}


@router.get("/test")
def test():

    result = service.test()

    return {
        "result": result
    }


@router.post("/verify")
async def verify_mission(

    image: UploadFile = File(...),

    mission_type: str = Form(...),

    decision_condition: str = Form(...)

):

    # -----------------------------
    # image 검증
    # -----------------------------

    if not image.filename:

        raise HTTPException(
            status_code=400,
            detail="이미지를 선택해주세요."
        )

    extension = image.filename.split(".")[-1].lower()

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

    # -----------------------------
    # 이미지 품질 검사
    # -----------------------------

    image_quality = image_quality_service.check(
        image_bytes
    )

    if image_quality is not None:

        return MissionValidator.validate_image_quality(
            image_quality
        )

    # -----------------------------
    # mission_type 검증
    # -----------------------------

    mission_type = mission_type.upper()

    if mission_type not in {

        "OBJECT",
        "ATTRIBUTE",
        "RELATION"

    }:

        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 mission_type입니다."
        )

    # -----------------------------
    # decision_condition 검증
    # -----------------------------

    try:

        decision_condition = json.loads(
            decision_condition
        )

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="decision_condition은 JSON 형식이어야 합니다."
        )

    # -----------------------------
    # AI 판정
    # -----------------------------

    try:

        prompt = PromptBuilder.build(

            mission_type=mission_type,

            decision_condition=decision_condition

        )

        ai_result = service.verify_mission(

            image_bytes=image_bytes,

            prompt=prompt

        )

        # -----------------------------
        # ReasonCode 매핑
        # -----------------------------

        ai_result = ReasonMapper.map(

            ai_result=ai_result,

            mission_type=mission_type

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