from enum import Enum


class MissionStatus(str, Enum):
    """
    최종 미션 판정 상태

    SUCCESS:
        미션 조건 만족

    FAIL:
        미션 실패

        포함:
        - 객체 없음
        - 속성 불일치
        - 관계 불일치
        - 이미지 품질 문제
        - 판정 불가
        - AI 오류
    """


    SUCCESS = "SUCCESS"

    FAIL = "FAIL"



class ReasonCode(str, Enum):
    """
    미션 판정 이유 코드
    """



    # =========================
    # 성공
    # =========================

    PASS = "PASS"



    # =========================
    # 이미지 품질 문제
    # =========================

    BLUR_IMAGE = "BLUR_IMAGE"

    DARK_IMAGE = "DARK_IMAGE"



    # =========================
    # 촬영 구도 / 객체 확인 문제
    # =========================

    PARTIAL_OBJECT = "PARTIAL_OBJECT"

    OBJECT_OFF_CENTER = "OBJECT_OFF_CENTER"



    # =========================
    # 판단 불가
    # =========================

    OBJECT_UNCERTAIN = "OBJECT_UNCERTAIN"

    ATTRIBUTE_UNCERTAIN = "ATTRIBUTE_UNCERTAIN"

    RELATION_UNCERTAIN = "RELATION_UNCERTAIN"



    # =========================
    # 명확한 미션 실패
    # =========================

    OBJECT_NOT_FOUND = "OBJECT_NOT_FOUND"

    ATTRIBUTE_MISMATCH = "ATTRIBUTE_MISMATCH"

    RELATION_MISMATCH = "RELATION_MISMATCH"

    NON_REAL_OBJECT = "NON_REAL_OBJECT"
    

    # =========================
    # 시스템 오류
    # =========================

    INVALID_IMAGE = "INVALID_IMAGE"