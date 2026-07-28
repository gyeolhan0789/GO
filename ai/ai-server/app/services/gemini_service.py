from io import BytesIO

from PIL import Image

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.mission import MissionResponse


class GeminiService:

    def __init__(self):

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

    def test(self) -> str:

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents="안녕하세요. 한 문장으로 자기소개 해주세요."
        )

        return response.text

    def verify_mission(
        self,
        image_bytes: bytes,
        prompt: str
    ) -> MissionResponse:

        # -----------------------------
        # 이미지 검증
        # -----------------------------

        try:

            image = Image.open(
                BytesIO(image_bytes)
            )

            image.verify()

            image = Image.open(
                BytesIO(image_bytes)
            ).convert("RGB")

        except Exception:

            raise ValueError(
                "손상된 이미지입니다."
            )

        # -----------------------------
        # Gemini 호출
        # -----------------------------

        try:

            response = self.client.models.generate_content(

                model="gemini-2.5-flash",

                contents=[
                    prompt,
                    image
                ],

                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=MissionResponse
                )
            )

            return response.parsed

        except Exception as e:

            raise RuntimeError(
                f"Gemini API 호출에 실패했습니다. ({e})"
            )