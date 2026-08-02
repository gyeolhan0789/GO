from PIL import Image
import torch

from transformers import (
    AutoProcessor,
    AutoModel
)


class SigLIP2Service:
    """
    SigLIP2 기반 이미지-텍스트 유사도 분석 서비스

    역할
    -----------------------
    - 이미지와 후보 텍스트 간 similarity 계산
    - 후보 label ranking 제공
    - 최종 미션 성공 여부 판단은 담당하지 않음

    Output
    -----------------------
    {
        "top_label": "a flower",
        "confidence": 0.92,
        "scores": {
            "a flower": 0.92,
            "a tree": 0.05
        }
    }
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



    def predict(
        self,
        image: Image.Image,
        candidates: list[str]
    ) -> dict:
        """
        이미지와 후보 label 간 similarity 계산

        Args:
            image:
                PIL Image

            candidates:
                비교할 텍스트 후보 리스트

        Returns:
            {
                "top_label": "a flower",
                "confidence": 0.92,
                "scores": {
                    "a flower":0.92,
                    "a tree":0.05
                }
            }
        """


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

            outputs = (
                self.model(**inputs)
            )


        logits = (
            outputs.logits_per_image
        )


        # 후보 label 간 상대 확률 변환
        probabilities = (
            torch.softmax(
                logits,
                dim=1
            )
            .cpu()
            .numpy()[0]
        )


        score_map = dict(
            zip(
                candidates,
                probabilities.tolist()
            )
        )


        top_label = max(
            score_map,
            key=score_map.get
        )


        confidence = (
            score_map[top_label]
        )


        return {
            "top_label": top_label,
            "confidence": float(confidence),
            "scores": score_map
        }