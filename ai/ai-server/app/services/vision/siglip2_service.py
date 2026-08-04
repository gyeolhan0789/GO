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
    SigLIP2 기반 이미지-텍스트 similarity 서비스

    역할
    -----------------------
    - Image embedding 생성
    - Text embedding 생성
    - cosine similarity 계산
    - candidate ranking 반환
    - inference latency 측정

    판단 책임
    -----------------------
    ❌ Mission 성공 여부 판단
    ❌ Threshold 판단
    ❌ Gemini fallback 결정
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
                self.MODEL_NAME
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
        bytes → RGB PIL Image
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
            (224,224),
            color="white"
        )


        self.predict(
            dummy_image,
            [
                "a photo of an object",
                "a photo without an object"
            ]
        )



    def predict(
            self,
            image: Image.Image,
            candidates: list[str]
        ) -> dict:

            if not candidates:
                raise ValueError(
                    "SigLIP candidate text가 없습니다."
                )

            if self.device == "cuda":
                torch.cuda.synchronize()

            start = time.perf_counter()


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


            with torch.no_grad():

                outputs = self.model(
                    **inputs
                )

                logits = (
                    outputs
                    .logits_per_image
                    .squeeze(0)
                )


                probabilities = (
                    torch.softmax(logits, dim=0)
                )


            if self.device == "cuda":
                torch.cuda.synchronize()


            latency_ms = (
                time.perf_counter()
                -
                start
            ) * 1000


            scores = (
                probabilities
                .cpu()
                .tolist()
            )


            score_map = dict(
                zip(
                    candidates,
                    scores
                )
            )


            top_label = max(
                score_map,
                key=score_map.get
            )


            top_score = score_map[top_label]


            logger.info(
                "[SigLIP2] latency=%.2fms top=%s score=%.4f",
                latency_ms,
                top_label,
                top_score
            )


            return {

                "top_label": top_label,

                "similarity_score": float(
                    top_score
                ),

                "scores": {
                    key: float(value)
                    for key, value in score_map.items()
                },

                "latency_ms": float(
                    latency_ms
                )
            }