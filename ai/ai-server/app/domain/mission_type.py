from enum import Enum


class MissionType(str, Enum):

    OBJECT = "OBJECT"

    ATTRIBUTE = "ATTRIBUTE"

    RELATION = "RELATION"