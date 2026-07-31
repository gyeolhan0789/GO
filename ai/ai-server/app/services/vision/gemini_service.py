import time
import logging

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.gemini import GeminiRawResponse

from app.domain.ai_result import AIResult
from app.services.vision.image_preprocessor import ImagePreprocessor


logger = logging.getLogger(__name__)


class GeminiService:

    def __init__(self):

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(
                timeout=15000
            )
        )


    def test(self) -> str:

        response = self.client.models.generate_content(

            model=settings.GEMINI_MODEL,

            contents="안녕하세요. 한 문장으로 자기소개 해주세요."

        )

        return response.text



    def verify_mission(
        self,
        image_bytes: bytes,
        prompt: str
    ) -> AIResult:
        """
        Gemini Vision 기반 미션 판정

        흐름
        ----------------
        1. 이미지 전처리
        2. Gemini Vision 호출
        3. Structured Output 변환
        """


        total_start = time.time()


        try:

            # --------------------------
            # Image preprocessing
            # --------------------------

            preprocess_start = time.time()


            image = ImagePreprocessor.preprocess(
                image_bytes
            )


            preprocess_latency = (
                time.time()
                -
                preprocess_start
            )


            logger.info(
                f"Image preprocessing latency: {preprocess_latency:.3f}s"
            )



            # --------------------------
            # Gemini API 호출
            # --------------------------

            gemini_start = time.time()


            response = self.client.models.generate_content(

                model=settings.GEMINI_MODEL,

                contents=[
                    prompt,
                    image
                ],

                config=types.GenerateContentConfig(

                    response_mime_type="application/json",

                    response_schema=GeminiRawResponse,

                    temperature=0.0

                )

            )


            gemini_latency = (
                time.time()
                -
                gemini_start
            )


            logger.info(
                f"Gemini API latency: {gemini_latency:.3f}s"
            )



            # --------------------------
            # Structured Output Parsing
            # --------------------------

            gemini_result: GeminiRawResponse = (
                response.parsed
            )


            if gemini_result is None:

                raise RuntimeError(
                    "Gemini response parsing failed."
                )



            total_latency = (
                time.time()
                -
                total_start
            )


            logger.info(
                f"Total mission verification latency: {total_latency:.3f}s"
            )


            return self.convert_to_ai_result(
                gemini_result
            )



        except Exception as e:

            logger.exception(
                "Gemini verification failed."
            )


            raise RuntimeError(
                f"Gemini API 호출에 실패했습니다. ({e})"
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