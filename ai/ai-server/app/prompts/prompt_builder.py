from app.prompts.mission_prompt import (
    OBJECT_PROMPT,
    ATTRIBUTE_PROMPT,
    RELATION_PROMPT,
)


class PromptBuilder:

    @staticmethod
    def build(
        mission_type: str,
        decision_condition: dict
    ) -> str:

        mission_type = mission_type.upper()

        if mission_type == "OBJECT":
            return PromptBuilder._build_object_prompt(
                decision_condition
            )

        elif mission_type == "ATTRIBUTE":
            return PromptBuilder._build_attribute_prompt(
                decision_condition
            )

        elif mission_type == "RELATION":
            return PromptBuilder._build_relation_prompt(
                decision_condition
            )

        raise ValueError(
            f"지원하지 않는 미션 타입입니다. ({mission_type})"
        )

    @staticmethod
    def _build_object_prompt(
        decision_condition: dict
    ) -> str:

        target = decision_condition.get("target")

        if not target:
            raise ValueError(
                "decision_condition.target가 없습니다."
            )

        return OBJECT_PROMPT.format(
            target=target
        )

    @staticmethod
    def _build_attribute_prompt(
        decision_condition: dict
    ) -> str:

        target = decision_condition.get("target")

        constraints = decision_condition.get(
            "constraints",
            {}
        )

        if not target:
            raise ValueError(
                "decision_condition.target가 없습니다."
            )

        if not constraints:
            raise ValueError(
                "decision_condition.constraints가 없습니다."
            )

        constraint_text = "\n".join(
            f"- {key}: {value}"
            for key, value in constraints.items()
        )

        return ATTRIBUTE_PROMPT.format(
            target=target,
            constraints=constraint_text
        )

    @staticmethod
    def _build_relation_prompt(
        decision_condition: dict
    ) -> str:

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
        relation = constraints.get("relation")

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

        return RELATION_PROMPT.format(
            subject=subject,
            object=obj,
            relation=relation
        )