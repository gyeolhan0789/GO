from app.prompts.mission_prompt import (
    OBJECT_PROMPT,
    ATTRIBUTE_PROMPT,
    RELATION_PROMPT,
)


class PromptBuilder:

    @classmethod
    def build(
        cls,
        mission_type: str,
        decision_condition: dict
    ) -> str:

        mission_type = mission_type.upper()

        # -----------------------------
        # decision_condition 검증
        # -----------------------------

        cls.validate_condition(
            mission_type,
            decision_condition
        )

        # -----------------------------
        # Prompt 생성
        # -----------------------------

        if mission_type == "OBJECT":
            return cls._build_object_prompt(
                decision_condition
            )

        elif mission_type == "ATTRIBUTE":
            return cls._build_attribute_prompt(
                decision_condition
            )

        elif mission_type == "RELATION":
            return cls._build_relation_prompt(
                decision_condition
            )

        raise ValueError(
            f"지원하지 않는 미션 타입입니다. ({mission_type})"
        )

    @classmethod
    def validate_condition(
        cls,
        mission_type: str,
        decision_condition: dict
    ) -> None:
        """
        mission_type별 필수 필드 검증
        """

        if mission_type == "OBJECT":

            target = decision_condition.get(
                "target"
            )

            if not target:
                raise ValueError(
                    "decision_condition.target가 없습니다."
                )

            return

        elif mission_type == "ATTRIBUTE":

            target = decision_condition.get(
                "target"
            )

            constraints = decision_condition.get(
                "constraints"
            )

            if not target:
                raise ValueError(
                    "decision_condition.target가 없습니다."
                )

            if not constraints:
                raise ValueError(
                    "decision_condition.constraints가 없습니다."
                )

            return

        elif mission_type == "RELATION":

            target = decision_condition.get(
                "target",
                {}
            )

            constraints = decision_condition.get(
                "constraints",
                {}
            )

            subject = target.get("subject")

            obj = target.get("object")

            relation = constraints.get(
                "relation"
            )

            if not subject:
                raise ValueError(
                    "relation subject가 없습니다."
                )

            if not obj:
                raise ValueError(
                    "relation object가 없습니다."
                )

            if not relation:
                raise ValueError(
                    "relation이 없습니다."
                )

            return

        raise ValueError(
            f"지원하지 않는 mission_type입니다. ({mission_type})"
        )

    @staticmethod
    def _build_object_prompt(
        decision_condition: dict
    ) -> str:

        return OBJECT_PROMPT.format(
            target=decision_condition["target"]
        )

    @staticmethod
    def _build_attribute_prompt(
        decision_condition: dict
    ) -> str:

        constraint_text = "\n".join(

            f"- {key}: {value}"

            for key, value in decision_condition[
                "constraints"
            ].items()

        )

        return ATTRIBUTE_PROMPT.format(

            target=decision_condition[
                "target"
            ],

            constraints=constraint_text

        )

    @staticmethod
    def _build_relation_prompt(
        decision_condition: dict
    ) -> str:

        return RELATION_PROMPT.format(

            subject=decision_condition[
                "target"
            ]["subject"],

            object=decision_condition[
                "target"
            ]["object"],

            relation=decision_condition[
                "constraints"
            ]["relation"]

        )