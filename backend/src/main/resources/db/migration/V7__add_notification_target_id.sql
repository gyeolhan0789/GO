ALTER TABLE notification
    ADD COLUMN target_id BIGINT NULL AFTER member_id;
