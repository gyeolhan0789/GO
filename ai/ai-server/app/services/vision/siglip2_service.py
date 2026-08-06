import io
import time
import logging

from PIL import Image

import torch

from transformers import (
    AutoProcessor,
    AutoModel
)


logger = logging.getLogger(__name__)


class SigLIP2Service:
    """
    SigLIP2 Image-Text Similarity Service


    역할
    -----------------------
    - Image / Text prompt similarity 계산
    - Positive / Negative prompt score 반환
    - Inference latency 측정


    책임 제외
    -----------------------
    ❌ 객체 존재 여부 판단
    ❌ threshold 적용
    ❌ margin 계산
    ❌ PASS / FAIL 판단
    ❌ Gemini fallback


    Flow:

    Image

      +

    Prompt List

      ↓

    SigLIP2

      ↓

    sigmoid score

      ↓

    ObjectVisionService
    """



    MODEL_NAME = (
        "google/"
        "siglip2-base-patch16-224"
    )



    def __init__(self):

        self.device = (
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )


        logger.info(
            "[SigLIP2] device=%s",
            self.device
        )



        self.processor = (
            AutoProcessor.from_pretrained(
                self.MODEL_NAME
            )
        )


        self.model = (
            AutoModel.from_pretrained(
                self.MODEL_NAME,
                dtype=(
                    torch.float16
                    if self.device == "cuda"
                    else torch.float32
                )
            )
            .to(self.device)
        )


        self.model.eval()



        logger.info(
            "[SigLIP2] warm-up start"
        )


        self._warm_up()


        logger.info(
            "[SigLIP2] ready"
        )



    def load_image(
        self,
        image_bytes: bytes
    ) -> Image.Image:
        """
        bytes -> RGB PIL Image
        """

        return (
            Image.open(
                io.BytesIO(image_bytes)
            )
            .convert("RGB")
        )



    def _warm_up(self):

        dummy_image = Image.new(
            "RGB",
            (224, 224),
            color="white"
        )


        self.predict(
            image=dummy_image,
            candidates=[
                "a photo of an object",
                "there is no object in the image"
            ]
        )



    def predict(
        self,
        image: Image.Image,
        candidates: list[str]
    ) -> dict:
        """
        Image-text similarity 계산


        Args:
            image:
                PIL Image


            candidates:
                비교할 text prompt 목록


        Returns:

        {
            "scores": {
                prompt: score
            },

            "latency_ms": float
        }

        """

        if not candidates:

            raise ValueError(
                "SigLIP candidate text가 없습니다."
            )



        if self.device == "cuda":

            torch.cuda.synchronize()



        start = time.perf_counter()



        # ==========================
        # Preprocess
        # ==========================

        inputs = self.processor(
            text=candidates,
            images=image,
            padding="max_length",
            return_tensors="pt"
        )



        inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
        }



        # ==========================
        # Inference
        # ==========================

        with torch.inference_mode():

            outputs = (
                self.model(
                    **inputs
                )
            )


            logits = (
                outputs
                .logits_per_image
                .squeeze(0)
            )

            # SigLIP은 softmax 확률보다
            # sigmoid 기반 image-text matching score 사용
            scores = (
                torch.sigmoid(
                    logits
                )
            )



        if self.device == "cuda":

            torch.cuda.synchronize()



        latency_ms = (
            time.perf_counter()
            -
            start
        ) * 1000



        # ==========================
        # Score Mapping
        # ==========================

        score_values = (
            scores
            .cpu()
            .tolist()
        )


        score_map = {

            candidate:
                float(score)

            for candidate, score
            in zip(
                candidates,
                score_values
            )
        }



        logger.info(
            "[SigLIP2] latency=%.2fms scores=%s",
            latency_ms,
            score_map
        )



        return {

            "scores": score_map,

            "latency_ms": float(
                latency_ms
            )

        }