import time
import logging
import json

from io import BytesIO

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

                base_url=settings.GEMINI_BASE_URL,

                timeout=15000

            )

        )



    def test(self):

        response = self.client.models.generate_content(

            model=settings.GEMINI_MODEL,

            contents=
                "안녕하세요. 한 문장으로 자기소개 해주세요."

        )


        logger.info(
            "========== RAW GEMINI ==========\n%s",
            response.text
        )


        return response.text





    def verify_mission(
        self,
        image_bytes: bytes,
        prompt: str
    ) -> AIResult:


        total_start = time.time()


        try:


            # ==========================
            # Image preprocessing
            # ==========================


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
                "Image preprocessing latency: %.3fs",
                preprocess_latency
            )



            # ==========================
            # Image bytes
            # ==========================


            buffer = BytesIO()


            image.save(
                buffer,
                format="JPEG"
            )


            processed_bytes = buffer.getvalue()



            contents = types.Content(

                role="user",

                parts=[

                    types.Part.from_text(
                        text=prompt
                    ),


                    types.Part.from_bytes(

                        data=processed_bytes,

                        mime_type="image/jpeg"

                    )

                ]

            )



            logger.info(
                "prompt length=%d",
                len(prompt)
            )



            # ==========================
            # Gemini API
            # ==========================


            gemini_start = time.time()


            response = self.client.models.generate_content(

                model=settings.GEMINI_MODEL,

                contents=contents,


                config=types.GenerateContentConfig(

                    response_mime_type=
                        "application/json",


                    temperature=0.0,


                    max_output_tokens=1024

                )

            )



            gemini_latency = (
                time.time()
                -
                gemini_start
            )


            logger.info(
                "Gemini API latency: %.3fs",
                gemini_latency
            )



            # ==========================
            # Raw Response Logging
            # ==========================


            logger.info(

                """
==============================
[Gemini Raw Response]

%s

==============================
""",

                response.text

            )



            if not response.text:


                raise RuntimeError(
                    "Gemini empty response"
                )



            # ==========================
            # JSON Normalize
            # ==========================


            json_text = (
                response.text
                .strip()
            )



            # markdown 제거

            if json_text.startswith(
                "```"
            ):

                json_text = (
                    json_text
                    .replace(
                        "```json",
                        ""
                    )
                    .replace(
                        "```",
                        ""
                    )
                    .strip()
                )



            # 혹시 앞뒤 설명 제거

            json_start = json_text.find("{")

            json_end = json_text.rfind("}")


            if (

                json_start != -1

                and

                json_end != -1

            ):

                json_text = (
                    json_text[
                        json_start:
                        json_end + 1
                    ]
                )



            # ==========================
            # Parse
            # ==========================


            try:


                parsed_json = json.loads(
                    json_text
                )


                gemini_result = GeminiRawResponse(
                    **parsed_json
                )



            except Exception as e:


                logger.error(

                    """
==============================
[Gemini Parse Failed]

raw:
%s


normalized:
%s


error:
%s

==============================
""",

                    response.text,

                    json_text,

                    e

                )


                raise RuntimeError(
                    "Gemini response parsing failed"
                )



            total_latency = (
                time.time()
                -
                total_start
            )


            logger.info(
                "Total mission verification latency: %.3fs",
                total_latency
            )



            return self.convert_to_ai_result(
                gemini_result
            )





        except Exception as e:


            logger.exception(
                "Gemini verification failed"
            )


            raise RuntimeError(
                f"Gemini API 호출 실패 ({e})"
            )







    def convert_to_ai_result(
        self,
        gemini_result: GeminiRawResponse
    ) -> AIResult:


        return AIResult(

            success=
                gemini_result.success,


            confidence=
                gemini_result.confidence,


            reason=
                gemini_result.reason,


            metadata={

                "decision_source":
                    "GEMINI"

            }

        )