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
from app.services.gemini_service import GeminiService


router = APIRouter(
    prefix="/mission",
    tags=["Mission"]
)


service = GeminiService()



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

    try:

        decision_condition = json.loads(
            decision_condition
        )


    except Exception:

        raise HTTPException(
            status_code=400,
            detail="decision_condition은 JSON 형식이어야 합니다."
        )


    try:

        prompt = PromptBuilder.build(
            mission_type=mission_type,
            decision_condition=decision_condition
        )


        image_bytes = await image.read()


        result = service.verify_mission(
            image_bytes=image_bytes,
            prompt=prompt
        )


        return result


    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )