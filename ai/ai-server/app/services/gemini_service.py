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

        image = Image.open(
            BytesIO(image_bytes)
        )

        image = image.convert("RGB")


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