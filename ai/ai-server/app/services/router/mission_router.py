from app.domain.mission_type import MissionType


class MissionRouter:
    """
    미션 타입에 따라 사용할 Vision Model 결정
    """


    def route(
        self,
        mission_type: MissionType
    ):

        if mission_type == MissionType.RELATION:
            return "GEMINI"


        if mission_type in [
            MissionType.OBJECT,
            MissionType.ATTRIBUTE
        ]:
            return "SIGLIP2"


        return "GEMINI"