from io import BytesIO

from PIL import Image


class ImagePreprocessor:
    """
    Gemini Vision 입력 이미지 전처리

    책임
    ----------------
    - 이미지 RGB 변환
    - 최대 크기 제한
    - JPEG 압축
    """

    MAX_SIZE = 768
    JPEG_QUALITY = 85


    @staticmethod
    def preprocess(
        image_bytes: bytes
    ) -> Image.Image:

        image = Image.open(
            BytesIO(image_bytes)
        )

        # PNG 투명 제거 및 Gemini 입력 통일
        image = image.convert("RGB")

        # 비율 유지 resize
        image.thumbnail(
            (
                ImagePreprocessor.MAX_SIZE,
                ImagePreprocessor.MAX_SIZE
            )
        )

        # JPEG 압축
        buffer = BytesIO()

        image.save(
            buffer,
            format="JPEG",
            quality=ImagePreprocessor.JPEG_QUALITY
        )

        buffer.seek(0)

        processed_image = Image.open(
            buffer
        ).copy()

        return processed_image