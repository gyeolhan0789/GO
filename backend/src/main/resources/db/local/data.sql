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
    (304, 'https://example.com/missions/object2.png', 'OBJECT', 'Find a red object', 'Submit a photo containing a red object.', '{"type":"OBJECT","value":"red"}'),
    (305, 'https://example.com/missions/object3.png', 'OBJECT', 'Find a green object', 'Submit a photo containing a green object.', '{"type":"OBJECT","value":"green"}'),
    (306, 'https://example.com/missions/attribute2.png', 'ATTRIBUTE', 'Find something long', 'Submit a photo containing a long object.', '{"type":"ATTRIBUTE","value":"long"}'),
    (307, 'https://example.com/missions/relation2.png', 'RELATION', 'Stand beside a bench', 'Submit a photo standing beside a bench.', '{"type":"RELATION","value":"bench"}'),
    (308, 'https://example.com/missions/object4.png', 'OBJECT', 'Find a yellow object', 'Submit a photo containing a yellow object.', '{"type":"OBJECT","value":"yellow"}'),
    (309, 'https://example.com/missions/attribute3.png', 'ATTRIBUTE', 'Find something square', 'Submit a photo containing a square object.', '{"type":"ATTRIBUTE","value":"square"}');

INSERT INTO rooms (id, name, host_id, mode, status, target_bingo_count, target_step_count, board_size)
VALUES
    (401, 'Local Waiting Room', 101, 'BATTLE', 'ACTIVE', 1, NULL, 3),
    (402, 'Local Active Room', 102, 'COOPERATE', 'ACTIVE', 1, 10000, 3),
    (403, 'Local Result Room', 101, 'COOPERATE', 'CLOSED', 1, 10000, 3);

INSERT INTO games (id, room_id, status, started_at, completed_at)
VALUES
    (491, 402, 'ACTIVE', '2026-07-27 09:00:00', NULL),
    (492, 403, 'ENDED', '2026-07-26 10:00:00', '2026-07-26 11:00:00');

INSERT INTO room_members (id, room_id, member_id, joined_at)
VALUES
    (451, 401, 101, '2026-07-27 08:00:00'),
    (452, 402, 101, '2026-07-27 09:00:00'),
    (453, 402, 102, '2026-07-27 09:00:00');

INSERT INTO game_participants (id, game_id, member_id, joined_at)
VALUES
    (471, 491, 101, '2026-07-27 09:00:00'),
    (472, 491, 102, '2026-07-27 09:00:00'),
    (473, 492, 101, '2026-07-26 10:00:00'),
    (474, 492, 103, '2026-07-26 10:00:00');

INSERT INTO bingo_boards (
    id,
    game_id,
    game_participant_id,
    board_type,
    board_size,
    target_bingo_count,
    target_step_count,
    status,
    completed_at
)
VALUES
    (501, 491, NULL, 'SHARED', 2, 1, 10000, 'ACTIVE', NULL),
    (502, 492, NULL, 'SHARED', 2, 1, 10000, 'COMPLETED', '2026-07-26 11:00:00');

INSERT INTO bingo_cells (
    id,
    board_id,
    mission_id,
    row_index,
    col_index,
    completed_at,
    submitted_at,
    verification_status,
    rejection_reason,
    member_id,
    submit_url
)
VALUES
    (551, 501, 301, 0, 0, NULL, '2026-07-27 09:10:00', 'PENDING', NULL, 101, 'https://example.com/submissions/pending.jpg'),
    (552, 501, 302, 0, 1, '2026-07-27 09:20:00', '2026-07-27 09:15:00', 'APPROVED', NULL, 101, 'https://example.com/submissions/approved.jpg'),
    (553, 501, 303, 1, 0, NULL, '2026-07-27 09:25:00', 'REJECTED', 'Image does not show the mission condition.', 101, 'https://example.com/submissions/rejected.jpg'),
    (554, 501, 304, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL),
    (555, 502, 301, 0, 0, '2026-07-26 10:20:00', '2026-07-26 10:15:00', 'APPROVED', NULL, 101, 'https://example.com/submissions/completed-1.jpg'),
    (556, 502, 302, 0, 1, '2026-07-26 10:30:00', '2026-07-26 10:25:00', 'APPROVED', NULL, 101, 'https://example.com/submissions/completed-2.jpg'),
    (557, 502, 303, 1, 0, '2026-07-26 10:40:00', '2026-07-26 10:35:00', 'APPROVED', NULL, 103, 'https://example.com/submissions/completed-3.jpg'),
    (558, 502, 304, 1, 1, '2026-07-26 10:50:00', '2026-07-26 10:45:00', 'APPROVED', NULL, 103, 'https://example.com/submissions/completed-4.jpg');

INSERT INTO game_requests (id, room_id, inviter_id, invitee_id, status)
VALUES
    (601, 401, 101, 103, 'PENDING'),
    (602, 402, 104, 101, 'ACCEPTED'),
    (603, 401, 101, 105, 'DECLINED');

INSERT INTO game_results (id, game_id, room_id, result, bingo_count, completed_mission_count, reward_cash)
VALUES
    (651, 492, 403, true, 1, 4, 200);

INSERT INTO game_result_participants (
    id,
    game_id,
    member_id,
    completed_mission_count,
    reward_cash,
    result
)
VALUES
    (661, 492, 101, 2, 200, true),
    (662, 492, 103, 2, 200, true);

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
