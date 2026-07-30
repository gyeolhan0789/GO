import cv2
import numpy as np

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


class ImageQualityService:
    """
    업로드 이미지 품질 검사

    역할
    -----------------------
    - AI Vision 호출 전 최소 품질 검증
    - Gemini가 판단 불가능한 이미지 차단
    - 손상 / 극심한 blur / 극단적인 dark 이미지 판단

    주의
    -----------------------
    - 객체 존재 여부 판단 X
    - 속성 판단 X
    - 관계 판단 X

    위 판단은 Gemini Vision 담당
    """

    # Laplacian variance 기준
    # 낮을수록 이미지가 흐림
    BLUR_THRESHOLD = 8.0


    # 평균 밝기 기준
    DARK_THRESHOLD = 20.0


    # 전체 픽셀 중 어두운 픽셀 비율
    # 90% 이상 어두워야 DARK_IMAGE 처리
    DARK_RATIO_THRESHOLD = 0.9


    # 품질 실패 confidence 최소값
    MIN_FAILURE_CONFIDENCE = 0.7



    def check(
        self,
        image_bytes: bytes
    ) -> AIResult | None:


        image_array = np.frombuffer(
            image_bytes,
            np.uint8
        )


        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )


        # --------------------------
        # 이미지 디코딩 실패
        # --------------------------

        if image is None:

            return AIResult(

                success=False,

                confidence=1.0,

                reason="이미지를 읽을 수 없습니다.",

                reason_code=ReasonCode.INVALID_IMAGE

            )


        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY
        )



        # --------------------------
        # Blur 검사
        # --------------------------

        variance = float(
            cv2.Laplacian(
                gray,
                cv2.CV_64F
            ).var()
        )


        if variance < self.BLUR_THRESHOLD:


            return AIResult(

                success=False,

                confidence=self.calculate_blur_confidence(
                    variance
                ),

                reason="사진이 너무 흐려 객체를 식별하기 어렵습니다.",

                reason_code=ReasonCode.BLUR_IMAGE

            )



        # --------------------------
        # Dark 검사
        # --------------------------

        brightness = float(
            gray.mean()
        )


        dark_ratio = np.mean(
            gray < self.DARK_THRESHOLD
        )


        # 전체적으로 거의 검은 이미지인 경우만 실패 처리
        if (

            brightness < self.DARK_THRESHOLD

            and

            dark_ratio > self.DARK_RATIO_THRESHOLD

        ):


            return AIResult(

                success=False,

                confidence=self.calculate_dark_confidence(
                    brightness,
                    dark_ratio
                ),

                reason="사진이 너무 어두워 객체를 식별할 수 없습니다.",

                reason_code=ReasonCode.DARK_IMAGE

            )


        # Gemini에게 전달
        return None




    def calculate_blur_confidence(
        self,
        variance: float
    ) -> float:
        """
        Blur로 인해 판정이 어려운 정도
        """

        raw_score = (

            self.BLUR_THRESHOLD - variance

        ) / self.BLUR_THRESHOLD


        confidence = (

            self.MIN_FAILURE_CONFIDENCE

            +

            raw_score
            *
            (
                1.0 - self.MIN_FAILURE_CONFIDENCE
            )

        )


        return round(

            max(

                self.MIN_FAILURE_CONFIDENCE,

                min(
                    1.0,
                    confidence
                )

            ),

            2

        )




    def calculate_dark_confidence(
        self,
        brightness: float,
        dark_ratio: float
    ) -> float:
        """
        Dark 이미지 판정 신뢰도

        brightness와 dark_ratio를 함께 고려
        """

        brightness_score = (

            self.DARK_THRESHOLD - brightness

        ) / self.DARK_THRESHOLD



        ratio_score = (

            dark_ratio - self.DARK_RATIO_THRESHOLD

        ) / (

            1.0 - self.DARK_RATIO_THRESHOLD

        )



        raw_score = (

            brightness_score * 0.5

            +

            ratio_score * 0.5

        )



        confidence = (

            self.MIN_FAILURE_CONFIDENCE

            +

            raw_score
            *
            (
                1.0 - self.MIN_FAILURE_CONFIDENCE
            )

        )


        return round(

            max(

                self.MIN_FAILURE_CONFIDENCE,

                min(
                    1.0,
                    confidence
                )

            ),

            2

        )