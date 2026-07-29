INSERT INTO member (id, email, password, nickname, region, gender, cash, onboarding_completed, role, auth_provider)
VALUES
    (2, 'admin-local@wecandoit.local', '$2b$10$HsrY96nGgLR5zUMEcvZ3nuTgyLiq8ABGdWaO/MraoIALlBS1NzVmG', 'local-admin-354', 'SEOUL', 'MALE', 0, false, 'ADMIN', 'LOCAL'),
    (101, 'test111@111.com', '$2b$10$8sHkEmlxplvBFONCDSvmVOyTHGtKcmS5SGEhEMKAaILv9eQ5tcDFy', 'test-user', 'SEOUL', 'MALE', 1500, true, 'USER', 'LOCAL'),
    (102, 'roomhost@wecandoit.local', '$2b$10$8sHkEmlxplvBFONCDSvmVOyTHGtKcmS5SGEhEMKAaILv9eQ5tcDFy', 'room-host', 'BUSAN', 'FEMALE', 1000, true, 'USER', 'LOCAL'),
    (103, 'friend@wecandoit.local', '$2b$10$8sHkEmlxplvBFONCDSvmVOyTHGtKcmS5SGEhEMKAaILv9eQ5tcDFy', 'friend-user', 'DAEGU', 'MALE', 800, true, 'USER', 'LOCAL'),
    (104, 'requester@wecandoit.local', '$2b$10$8sHkEmlxplvBFONCDSvmVOyTHGtKcmS5SGEhEMKAaILv9eQ5tcDFy', 'request-user', 'INCHEON', 'FEMALE', 600, true, 'USER', 'LOCAL'),
    (105, 'declined@wecandoit.local', '$2b$10$8sHkEmlxplvBFONCDSvmVOyTHGtKcmS5SGEhEMKAaILv9eQ5tcDFy', 'declined-user', 'GWANGJU', 'FEMALE', 400, true, 'USER', 'LOCAL');

INSERT INTO items (id, name, category, price, image_url)
VALUES
    (201, 'Blue Cap', 'HAT', 100, 'https://example.com/items/blue-cap.png'),
    (202, 'Green Top', 'TOP', 200, 'https://example.com/items/green-top.png'),
    (203, 'Black Pants', 'BOTTOM', 300, 'https://example.com/items/black-pants.png'),
    (204, 'White Shoes', 'SHOES', 400, 'https://example.com/items/white-shoes.png'),
    (205, 'Round Glasses', 'SUNGLASSES', 500, 'https://example.com/items/round-glasses.png');

INSERT INTO missions (id, mission_image_url, type, title, detail, decision_condition)
VALUES
    (301, 'https://example.com/missions/object.png', 'OBJECT', 'Find a blue object', 'Submit a photo containing a blue object.', '{"type":"OBJECT","value":"blue"}'),
    (302, 'https://example.com/missions/attribute.png', 'ATTRIBUTE', 'Find something round', 'Submit a photo containing a round object.', '{"type":"ATTRIBUTE","value":"round"}'),
    (303, 'https://example.com/missions/relation.png', 'RELATION', 'Stand beside a tree', 'Submit a photo standing beside a tree.', '{"type":"RELATION","value":"tree"}'),
    (304, 'https://example.com/missions/object2.png', 'OBJECT', 'Find a red object', 'Submit a photo containing a red object.', '{"type":"OBJECT","value":"red"}');

INSERT INTO rooms (id, name, host_id, mode, status, target_bingo_count, board_size, started_at)
VALUES
    (401, 'Local Waiting Room', 101, 'COOPERATE', 'WAITING', NULL, 2, NULL),
    (402, 'Local Active Room', 102, 'COOPERATE', 'IN_PROGRESS', NULL, 2, '2026-07-27 09:00:00'),
    (403, 'Local Result Room', 101, 'COOPERATE', 'COMPLETED', NULL, 2, '2026-07-26 10:00:00');

INSERT INTO room_members (id, room_id, member_id, completed_mission_count, joined_at)
VALUES
    (451, 401, 101, 0, '2026-07-27 08:00:00'),
    (452, 402, 101, 1, '2026-07-27 09:00:00'),
    (453, 402, 102, 1, '2026-07-27 09:00:00'),
    (454, 403, 101, 2, '2026-07-26 10:00:00'),
    (455, 403, 103, 2, '2026-07-26 10:00:00');

INSERT INTO bingo_boards (id, room_id, board_size, status, completed_at)
VALUES
    (501, 402, 2, 'IN_PROGRESS', NULL),
    (502, 403, 2, 'COMPLETED', '2026-07-26 11:00:00');

INSERT INTO bingo_cells (id, board_id, mission_id, `row`, col, completed_at, verification_status, rejection_reason, member_id, submit_url)
VALUES
    (551, 501, 301, 0, 0, NULL, 'PENDING', NULL, 101, 'https://example.com/submissions/pending.jpg'),
    (552, 501, 302, 0, 1, '2026-07-27 09:20:00', 'APPROVED', NULL, 101, 'https://example.com/submissions/approved.jpg'),
    (553, 501, 303, 1, 0, NULL, 'REJECTED', 'Image does not show the mission condition.', 101, 'https://example.com/submissions/rejected.jpg'),
    (554, 501, 304, 1, 1, NULL, NULL, NULL, NULL, NULL),
    (555, 502, 301, 0, 0, '2026-07-26 10:20:00', 'APPROVED', NULL, 101, 'https://example.com/submissions/completed-1.jpg'),
    (556, 502, 302, 0, 1, '2026-07-26 10:30:00', 'APPROVED', NULL, 101, 'https://example.com/submissions/completed-2.jpg'),
    (557, 502, 303, 1, 0, '2026-07-26 10:40:00', 'APPROVED', NULL, 103, 'https://example.com/submissions/completed-3.jpg'),
    (558, 502, 304, 1, 1, '2026-07-26 10:50:00', 'APPROVED', NULL, 103, 'https://example.com/submissions/completed-4.jpg');

INSERT INTO game_requests (id, room_id, inviter_id, invitee_id, status)
VALUES
    (601, 401, 101, 103, 'PENDING'),
    (602, 402, 104, 101, 'ACCEPTED'),
    (603, 401, 101, 105, 'DECLINED');

INSERT INTO game_results (id, room_id, result, bingo_count, completed_mission_count, reward_cash)
VALUES
    (651, 403, true, 1, 2, 300);

INSERT INTO friends (id, member1_id, member2_id)
VALUES
    (701, 101, 103),
    (702, 101, 104);

INSERT INTO friend_requests (id, inviter_id, invitee_id, status)
VALUES
    (751, 101, 102, 'PENDING'),
    (752, 103, 101, 'ACCEPTED'),
    (753, 101, 105, 'REJECTED');

INSERT INTO member_items (id, member_id, item_id)
VALUES
    (801, 101, 201),
    (802, 101, 202),
    (803, 101, 203),
    (804, 101, 204),
    (805, 101, 205);

INSERT INTO member_equipped_items (id, category, member_id, member_items_id)
VALUES
    (851, 'HAT', 101, 801),
    (852, 'TOP', 101, 802),
    (853, 'BOTTOM', 101, 803),
    (854, 'SHOES', 101, 804),
    (855, 'SUNGLASSES', 101, 805);

INSERT INTO member_histories (id, member_id, history_date, step, distance, calories)
VALUES
    (901, 101, '2026-07-26', 4200, 3100, 180),
    (902, 101, '2026-07-27', 6100, 4600, 260);

INSERT INTO cash_histories (id, member_id, transaction_type, amount, reference_id, item_name)
VALUES
    (951, 101, 'BINGO_REWARD', 300, 403, NULL),
    (952, 101, 'ITEM_PURCHASE', -100, 201, 'Blue Cap'),
    (953, 101, 'ITEM_PURCHASE', -200, 202, 'Green Top'),
    (954, 101, 'ITEM_PURCHASE', -300, 203, 'Black Pants'),
    (955, 101, 'ITEM_PURCHASE', -400, 204, 'White Shoes'),
    (956, 101, 'ITEM_PURCHASE', -500, 205, 'Round Glasses');
