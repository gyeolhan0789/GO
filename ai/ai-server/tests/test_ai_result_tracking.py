from app.mappers.siglip_result_mapper import (
    SigLIPResultMapper
)

from app.domain.model_info import ModelType



def test_siglip_model_tracking():

    mapper = SigLIPResultMapper()


    siglip_result = {

        "top_label": "a flower",

        "confidence": 0.8,

        "scores": {

            "a flower": 0.8,

            "not a flower": 0.2

        },

        "latency_ms": 150.5

    }


    result = mapper.map(
        siglip_result
    )


    assert (
        result.model_name
        ==
        "google/siglip2-base-patch16-224"
    )


    assert (
        result.model_type
        ==
        ModelType.VISION
    )


    assert (
        result.latency_ms
        ==
        150.5
    )