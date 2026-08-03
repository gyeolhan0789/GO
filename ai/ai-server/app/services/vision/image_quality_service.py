import cv2
import numpy as np

from app.domain.ai_result import AIResult
from app.domain.mission_result import ReasonCode


class ImageQualityService:
    """
    업로드 이미지 품질 검사

    역할
    -----------------------
    - Gemini 호출 전 이미지 품질 검증
    - 판단 불가능한 이미지 사전 차단

    주의
    -----------------------
    - 객체 존재 판단 X
    - 속성 판단 X
    - 관계 판단 X
    """

    # Laplacian variance 기준
    # 낮을수록 blur 가능성 증가
    BLUR_THRESHOLD = 15.0

    # 평균 밝기 기준
    DARK_THRESHOLD = 25.0

    # 전체 픽셀 중 어두운 픽셀 비율
    DARK_RATIO_THRESHOLD = 0.9

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
        # Dark 검사
        # Blur보다 먼저 수행
        # --------------------------

        brightness = float(
            gray.mean()
        )

        dark_ratio = float(
            np.mean(
                gray < self.DARK_THRESHOLD
            )
        )

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

                reason="사진이 어두워 객체 식별이 어렵습니다.",

                reason_code=ReasonCode.DARK_IMAGE

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

                reason="사진이 흐려 객체 식별이 어렵습니다.",

                reason_code=ReasonCode.BLUR_IMAGE

            )

        # Gemini 전달
        return None

    def calculate_blur_confidence(
        self,
        variance: float
    ) -> float:
        """
        Blur 상태 판단 신뢰도

        blur 여부는 확실하지만
        미션 판정은 불가능하므로
        낮은 confidence 사용
        """

        severity = (
            self.BLUR_THRESHOLD - variance
        ) / self.BLUR_THRESHOLD

        severity = max(
            0.0,
            min(
                1.0,
                severity
            )
        )

        confidence = (
            0.3
            +
            severity * 0.3
        )

        return round(
            confidence,
            2
        )

    def calculate_dark_confidence(
        self,
        brightness: float,
        dark_ratio: float
    ) -> float:
        """
        Dark 상태 판단 신뢰도

        Dark 여부는 확실하지만
        미션 판정은 불가능하므로
        Blur와 동일한 기준 사용
        """

        brightness_score = (
            self.DARK_THRESHOLD - brightness
        ) / self.DARK_THRESHOLD

        brightness_score = max(
            0.0,
            min(
                1.0,
                brightness_score
            )
        )

        ratio_score = (
            dark_ratio - self.DARK_RATIO_THRESHOLD
        ) / (
            1.0 - self.DARK_RATIO_THRESHOLD
        )

        ratio_score = max(
            0.0,
            min(
                1.0,
                ratio_score
            )
        )

        severity = (
            brightness_score * 0.5
            +
            ratio_score * 0.5
        )

        confidence = (
            0.3
            +
            severity * 0.3
        )

        return round(
            confidence,
            2
        )