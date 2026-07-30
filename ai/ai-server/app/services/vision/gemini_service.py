from io import BytesIO

from PIL import Image

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.gemini import GeminiRawResponse

from app.domain.ai_result import AIResult


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
    ) -> AIResult:
        """
        Gemini Vision을 통해 미션 판정
        """

        image = self.validate_image(
            image_bytes
        )

        try:

            response = self.client.models.generate_content(

                model="gemini-2.5-flash",

                contents=[
                    prompt,
                    image
                ],

                config=types.GenerateContentConfig(

                    response_mime_type="application/json",

                    response_schema=GeminiRawResponse

                )

            )

            gemini_result: GeminiRawResponse = (
                response.parsed
            )

            return self.convert_to_ai_result(
                gemini_result
            )

        except Exception as e:

            raise RuntimeError(
                f"Gemini API 호출에 실패했습니다. ({e})"
            )

    def validate_image(
        self,
        image_bytes: bytes
    ) -> Image.Image:
        """
        업로드된 이미지 검증
        """

        try:

            image = Image.open(
                BytesIO(image_bytes)
            )

            image.verify()

            image = Image.open(
                BytesIO(image_bytes)
            ).convert("RGB")

            return image

        except Exception:

            raise ValueError(
                "손상된 이미지입니다."
            )

    def convert_to_ai_result(
        self,
        gemini_result: GeminiRawResponse
    ) -> AIResult:
        """
        Gemini 응답을 내부 AIResult로 변환
        """

        return AIResult(

            success=gemini_result.success,

            confidence=gemini_result.confidence,

            reason=gemini_result.reason

        )