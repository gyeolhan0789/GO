INSERT INTO member (
    id,
    email,
    password,
    nickname,
    region,
    gender,
    cash,
    onboarding_completed,
    role,
    auth_provider,
    fcm_token,
    created_at,
    updated_at
)
VALUES
    (1000, 'admin-dev@wecandoit.local', '$2a$10$I37N4pEivzoMDW4LjPhnF.ZKYqsxaHgrtxDzI781ZdPwJga/QUSdW', 'dev-admin', 'SEOUL', 'MALE', 0, true, 'ADMIN', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1001, 'host-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-host', 'SEOUL', 'MALE', 5000, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1002, 'coop-friend1-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-coop-one', 'BUSAN', 'FEMALE', 1500, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1003, 'coop-friend2-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-coop-two', 'DAEGU', 'MALE', 1200, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1004, 'coop-friend3-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-coop-three', 'INCHEON', 'FEMALE', 1000, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1005, 'requester-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-requester', 'GWANGJU', 'MALE', 800, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1006, 'invitee-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-invitee', 'DAEJEON', 'FEMALE', 700, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1007, 'outsider-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-outsider', 'ULSAN', 'MALE', 0, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1008, 'fresh-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-fresh', 'SEJONG', 'FEMALE', 500, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1009, 'single-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-single', 'GYEONGGI', 'MALE', 900, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1010, 'battle-host-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-battle-host', 'GANGWON', 'MALE', 1100, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1011, 'battle-user-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-battle-user', 'CHUNGBUK', 'FEMALE', 1000, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6)),
    (1012, 'remove-friend-dev@wecandoit.local', '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru', 'dev-remove-friend', 'CHUNGNAM', 'MALE', 600, true, 'USER', 'LOCAL', NULL, NOW(6), NOW(6));

INSERT INTO missions (
    id,
    mission_image_url,
    type,
    title,
    detail,
    decision_condition,
    created_at,
    updated_at
)
VALUES
    (2001, 'https://placehold.co/512x512/png?text=Mission+01', 'OBJECT', '파란 물건 찾기', '파란색 물건이 보이도록 촬영하세요.', '{"target": "파란 물건"}', NOW(6), NOW(6)),
    (2002, 'https://placehold.co/512x512/png?text=Mission+02', 'OBJECT', '빨간 물건 찾기', '빨간색 물건이 보이도록 촬영하세요.', '{"target": "빨간 물건"}', NOW(6), NOW(6)),
    (2003, 'https://placehold.co/512x512/png?text=Mission+03', 'OBJECT', '초록 물건 찾기', '초록색 물건이 보이도록 촬영하세요.', '{"target": "초록 물건"}', NOW(6), NOW(6)),
    (2004, 'https://placehold.co/512x512/png?text=Mission+04', 'OBJECT', '노란 물건 찾기', '노란색 물건이 보이도록 촬영하세요.', '{"target": "노란 물건"}', NOW(6), NOW(6)),
    (2005, 'https://placehold.co/512x512/png?text=Mission+05', 'OBJECT', '의자 찾기', '의자가 보이도록 촬영하세요.', '{"target": "의자"}', NOW(6), NOW(6)),
    (2006, 'https://placehold.co/512x512/png?text=Mission+06', 'OBJECT', '나무 찾기', '나무가 보이도록 촬영하세요.', '{"target": "나무"}', NOW(6), NOW(6)),
    (2007, 'https://placehold.co/512x512/png?text=Mission+07', 'OBJECT', '자동차 찾기', '자동차가 보이도록 촬영하세요.', '{"target": "자동차"}', NOW(6), NOW(6)),
    (2008, 'https://placehold.co/512x512/png?text=Mission+08', 'OBJECT', '가방 찾기', '가방이 보이도록 촬영하세요.', '{"target": "가방"}', NOW(6), NOW(6)),
    (2009, 'https://placehold.co/512x512/png?text=Mission+09', 'OBJECT', '꽃 찾기', '꽃이 보이도록 촬영하세요.', '{"target": "꽃"}', NOW(6), NOW(6)),
    (2010, 'https://placehold.co/512x512/png?text=Mission+10', 'ATTRIBUTE', '둥근 물건 찾기', '둥근 형태의 물건을 촬영하세요.', '{"target": "물건", "constraints": {"shape": "둥근"}}', NOW(6), NOW(6)),
    (2011, 'https://placehold.co/512x512/png?text=Mission+11', 'ATTRIBUTE', '네모난 물건 찾기', '네모난 형태의 물건을 촬영하세요.', '{"target": "물건", "constraints": {"shape": "네모난"}}', NOW(6), NOW(6)),
    (2012, 'https://placehold.co/512x512/png?text=Mission+12', 'ATTRIBUTE', '긴 물건 찾기', '길쭉한 물건을 촬영하세요.', '{"target": "물건", "constraints": {"shape": "긴"}}', NOW(6), NOW(6)),
    (2013, 'https://placehold.co/512x512/png?text=Mission+13', 'ATTRIBUTE', '작은 물건 찾기', '손바닥보다 작은 물건을 촬영하세요.', '{"target": "물건", "constraints": {"size": "작은"}}', NOW(6), NOW(6)),
    (2014, 'https://placehold.co/512x512/png?text=Mission+14', 'ATTRIBUTE', '큰 물건 찾기', '사람보다 큰 물건을 촬영하세요.', '{"target": "물건", "constraints": {"size": "큰"}}', NOW(6), NOW(6)),
    (2015, 'https://placehold.co/512x512/png?text=Mission+15', 'ATTRIBUTE', '빛나는 물건 찾기', '빛을 반사하는 물건을 촬영하세요.', '{"target": "물건", "constraints": {"appearance": "빛나는"}}', NOW(6), NOW(6)),
    (2016, 'https://placehold.co/512x512/png?text=Mission+16', 'ATTRIBUTE', '부드러운 물건 찾기', '부드러운 재질의 물건을 촬영하세요.', '{"target": "물건", "constraints": {"texture": "부드러운"}}', NOW(6), NOW(6)),
    (2017, 'https://placehold.co/512x512/png?text=Mission+17', 'ATTRIBUTE', '투명한 물건 찾기', '투명한 물건을 촬영하세요.', '{"target": "물건", "constraints": {"appearance": "투명한"}}', NOW(6), NOW(6)),
    (2018, 'https://placehold.co/512x512/png?text=Mission+18', 'RELATION', '나무 옆에서 촬영', '나무 옆에 서서 촬영하세요.', '{"target": {"subject": "사람", "object": "나무"}, "constraints": {"relation": "옆"}}', NOW(6), NOW(6)),
    (2019, 'https://placehold.co/512x512/png?text=Mission+19', 'RELATION', '벤치 앞에서 촬영', '벤치 앞에 서서 촬영하세요.', '{"target": {"subject": "사람", "object": "벤치"}, "constraints": {"relation": "앞"}}', NOW(6), NOW(6)),
    (2020, 'https://placehold.co/512x512/png?text=Mission+20', 'RELATION', '친구와 함께 촬영', '친구 한 명과 함께 촬영하세요.', '{"target": {"subject": "사람", "object": "친구"}, "constraints": {"relation": "함께"}}', NOW(6), NOW(6)),
    (2021, 'https://placehold.co/512x512/png?text=Mission+21', 'RELATION', '건물 앞에서 촬영', '건물 입구 앞에서 촬영하세요.', '{"target": {"subject": "사람", "object": "건물 입구"}, "constraints": {"relation": "앞"}}', NOW(6), NOW(6)),
    (2022, 'https://placehold.co/512x512/png?text=Mission+22', 'RELATION', '횡단보도 옆에서 촬영', '횡단보도 옆에서 안전하게 촬영하세요.', '{"target": {"subject": "사람", "object": "횡단보도"}, "constraints": {"relation": "옆"}}', NOW(6), NOW(6)),
    (2023, 'https://placehold.co/512x512/png?text=Mission+23', 'RELATION', '표지판 아래에서 촬영', '표지판 아래에 서서 촬영하세요.', '{"target": {"subject": "사람", "object": "표지판"}, "constraints": {"relation": "아래"}}', NOW(6), NOW(6)),
    (2024, 'https://placehold.co/512x512/png?text=Mission+24', 'RELATION', '계단 위에서 촬영', '계단 위에 서서 촬영하세요.', '{"target": {"subject": "사람", "object": "계단"}, "constraints": {"relation": "위"}}', NOW(6), NOW(6)),
    (2025, 'https://placehold.co/512x512/png?text=Mission+25', 'RELATION', '문 옆에서 촬영', '문 옆에 서서 촬영하세요.', '{"target": {"subject": "사람", "object": "문"}, "constraints": {"relation": "옆"}}', NOW(6), NOW(6));

INSERT INTO items (
    id,
    name,
    category,
    price,
    image_url,
    available_for_sale,
    created_at,
    updated_at
)
VALUES
    (2101, 'Dev Blue Cap', 'HAT', 300, 'https://placehold.co/512x512/png?text=Blue+Cap', true, NOW(6), NOW(6)),
    (2102, 'Dev Green Top', 'TOP', 500, 'https://placehold.co/512x512/png?text=Green+Top', true, NOW(6), NOW(6)),
    (2103, 'Dev Black Pants', 'BOTTOM', 700, 'https://placehold.co/512x512/png?text=Black+Pants', true, NOW(6), NOW(6)),
    (2104, 'Dev White Shoes', 'SHOES', 900, 'https://placehold.co/512x512/png?text=White+Shoes', true, NOW(6), NOW(6)),
    (2105, 'Dev Round Glasses', 'SUNGLASSES', 400, 'https://placehold.co/512x512/png?text=Glasses', true, NOW(6), NOW(6)),
    (2106, 'Dev Star Badge', 'ACCESSORY', 200, 'https://placehold.co/512x512/png?text=Star+Badge', true, NOW(6), NOW(6)),
    (2107, 'Dev Premium Hat', 'HAT', 10000, 'https://placehold.co/512x512/png?text=Premium+Hat', true, NOW(6), NOW(6)),
    (2108, 'Dev Retired Top', 'TOP', 100, 'https://placehold.co/512x512/png?text=Retired+Top', false, NOW(6), NOW(6));

INSERT INTO default_character_assets (
    id,
    gender,
    image_url,
    created_at,
    updated_at
)
VALUES
    (2201, 'MALE', 'https://placehold.co/512x512/png?text=Male+Character', NOW(6), NOW(6)),
    (2202, 'FEMALE', 'https://placehold.co/512x512/png?text=Female+Character', NOW(6), NOW(6));

INSERT INTO friends (
    id,
    member1_id,
    member2_id,
    created_at,
    updated_at
)
VALUES
    (3001, 1001, 1002, DATE_SUB(NOW(6), INTERVAL 30 DAY), DATE_SUB(NOW(6), INTERVAL 30 DAY)),
    (3002, 1001, 1003, DATE_SUB(NOW(6), INTERVAL 25 DAY), DATE_SUB(NOW(6), INTERVAL 25 DAY)),
    (3003, 1001, 1004, DATE_SUB(NOW(6), INTERVAL 20 DAY), DATE_SUB(NOW(6), INTERVAL 20 DAY)),
    (3004, 1001, 1005, DATE_SUB(NOW(6), INTERVAL 15 DAY), DATE_SUB(NOW(6), INTERVAL 15 DAY)),
    (3005, 1010, 1011, DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 10 DAY)),
    (3006, 1001, 1012, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

INSERT INTO friend_requests (
    id,
    inviter_id,
    invitee_id,
    status,
    created_at,
    updated_at
)
VALUES
    (3101, 1005, 1006, 'PENDING', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (3102, 1006, 1007, 'PENDING', DATE_SUB(NOW(6), INTERVAL 3 HOUR), DATE_SUB(NOW(6), INTERVAL 3 HOUR)),
    (3103, 1008, 1007, 'ACCEPTED', DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (3104, 1007, 1004, 'REJECTED', DATE_SUB(NOW(6), INTERVAL 9 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY));

INSERT INTO member_histories (
    id,
    member_id,
    history_date,
    step,
    distance,
    calories,
    created_at,
    updated_at
)
VALUES
    (3201, 1001, CURRENT_DATE, 12000, 8400, 520, NOW(6), NOW(6)),
    (3202, 1001, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 8500, 5950, 370, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (3203, 1001, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 6200, 4340, 280, DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 10 DAY)),
    (3204, 1002, CURRENT_DATE, 10000, 7000, 430, NOW(6), NOW(6)),
    (3205, 1003, CURRENT_DATE, 8000, 5600, 350, NOW(6), NOW(6)),
    (3206, 1004, CURRENT_DATE, 6000, 4200, 260, NOW(6), NOW(6)),
    (3207, 1005, CURRENT_DATE, 4000, 2800, 180, NOW(6), NOW(6)),
    (3208, 1007, CURRENT_DATE, 1000, 700, 45, NOW(6), NOW(6)),
    (3209, 1010, CURRENT_DATE, 9000, 6300, 390, NOW(6), NOW(6)),
    (3210, 1011, CURRENT_DATE, 7000, 4900, 310, NOW(6), NOW(6));

INSERT INTO member_items (
    id,
    member_id,
    item_id,
    created_at,
    updated_at
)
VALUES
    (3501, 1001, 2101, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (3502, 1001, 2102, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (3503, 1001, 2103, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (3504, 1002, 2105, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY));

INSERT INTO member_equipped_items (
    id,
    category,
    member_id,
    member_items_id,
    created_at,
    updated_at
)
VALUES
    (3601, 'HAT', 1001, 3501, DATE_SUB(NOW(6), INTERVAL 5 DAY), NOW(6)),
    (3602, 'TOP', 1001, 3502, DATE_SUB(NOW(6), INTERVAL 4 DAY), NOW(6)),
    (3603, 'BOTTOM', 1001, 3503, DATE_SUB(NOW(6), INTERVAL 3 DAY), NOW(6)),
    (3604, 'SUNGLASSES', 1002, 3504, DATE_SUB(NOW(6), INTERVAL 2 DAY), NOW(6));

INSERT INTO cash_histories (
    id,
    member_id,
    transaction_type,
    amount,
    reference_id,
    room_id,
    item_name,
    created_at,
    updated_at
)
VALUES
    (3301, 1001, 'GAME_GOAL_REWARD', 300, 5102, 4011, NULL, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (3302, 1001, 'BINGO_CELL_REWARD', 50, 8001, 4001, NULL, DATE_SUB(NOW(6), INTERVAL 22 HOUR), DATE_SUB(NOW(6), INTERVAL 22 HOUR)),
    (3303, 1001, 'DAILY_STEP_GOAL_REWARD', 100, 7001, 4001, NULL, DATE_SUB(NOW(6), INTERVAL 1 HOUR), DATE_SUB(NOW(6), INTERVAL 1 HOUR)),
    (3304, 1001, 'ITEM_PURCHASE', -300, 2101, NULL, 'Dev Blue Cap', DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

INSERT INTO notification (
    id,
    member_id,
    type,
    title,
    body,
    is_read,
    created_at,
    updated_at
)
VALUES
    (3401, 1001, 'FRIEND_INVITE', '게임 초대', '친구가 게임에 초대했습니다.', false, DATE_SUB(NOW(6), INTERVAL 30 MINUTE), DATE_SUB(NOW(6), INTERVAL 30 MINUTE)),
    (3402, 1001, 'FRIEND_REQUEST', '친구 요청', '새로운 친구 요청이 도착했습니다.', false, DATE_SUB(NOW(6), INTERVAL 1 HOUR), DATE_SUB(NOW(6), INTERVAL 1 HOUR)),
    (3403, 1001, 'WALK_START', '걷기 시작', '친구가 걷기를 시작했습니다.', true, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 1 HOUR)),
    (3404, 1001, 'BATTLE_RESULT', '대결 결과', '대결 결과가 확정되었습니다.', false, DATE_SUB(NOW(6), INTERVAL 3 HOUR), DATE_SUB(NOW(6), INTERVAL 3 HOUR)),
    (3405, 1001, 'WEEKLY_BINGO_RENEWAL', '빙고판 갱신', '갱신이 필요한 빙고판이 있습니다.', false, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (3406, 1001, 'REWARD_EARNED', '보상 획득', '빙고 보상을 획득했습니다.', true, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (3407, 1002, 'FRIEND_INVITE', '게임 초대', '친구가 게임에 초대했습니다.', false, DATE_SUB(NOW(6), INTERVAL 4 HOUR), DATE_SUB(NOW(6), INTERVAL 4 HOUR));

INSERT INTO rooms (
    id,
    name,
    host_id,
    mode,
    status,
    target_bingo_count,
    target_step_count,
    board_size,
    created_at,
    updated_at
)
VALUES
    (4001, '4인 협력 진행방', 1001, 'COOPERATE', 'ACTIVE', NULL, 10000, 3, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4002, '중간 참여 협력방', 1001, 'COOPERATE', 'ACTIVE', NULL, 8000, 3, DATE_SUB(NOW(6), INTERVAL 2 DAY), NOW(6)),
    (4003, '갱신 필요 협력방', 1001, 'COOPERATE', 'ACTIVE', NULL, 12000, 3, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (4004, '전체 완료 협력방', 1001, 'COOPERATE', 'ACTIVE', NULL, 9000, 3, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4005, '검증 대기 협력방', 1001, 'COOPERATE', 'ACTIVE', NULL, 11000, 3, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (4006, '싱글 진행방', 1009, 'SINGLE', 'ACTIVE', NULL, 7000, 3, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4007, '대결 대기방', 1010, 'BATTLE', 'ACTIVE', 2, NULL, 3, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4008, '대결 진행방', 1010, 'BATTLE', 'ACTIVE', 2, NULL, 3, DATE_SUB(NOW(6), INTERVAL 2 HOUR), NOW(6));

INSERT INTO room_members (
    id,
    room_id,
    member_id,
    joined_at,
    created_at,
    updated_at
)
VALUES
    (4101, 4001, 1001, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4102, 4001, 1002, DATE_SUB(NOW(6), INTERVAL 23 HOUR), DATE_SUB(NOW(6), INTERVAL 23 HOUR), NOW(6)),
    (4103, 4001, 1003, DATE_SUB(NOW(6), INTERVAL 22 HOUR), DATE_SUB(NOW(6), INTERVAL 22 HOUR), NOW(6)),
    (4104, 4001, 1004, DATE_SUB(NOW(6), INTERVAL 21 HOUR), DATE_SUB(NOW(6), INTERVAL 21 HOUR), NOW(6)),
    (4105, 4002, 1001, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY), NOW(6)),
    (4106, 4002, 1002, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4107, 4003, 1001, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (4108, 4003, 1003, DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY), NOW(6)),
    (4109, 4004, 1001, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4110, 4004, 1004, DATE_SUB(NOW(6), INTERVAL 20 HOUR), DATE_SUB(NOW(6), INTERVAL 20 HOUR), NOW(6)),
    (4111, 4005, 1001, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (4112, 4005, 1005, DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY), NOW(6)),
    (4113, 4006, 1009, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4114, 4007, 1010, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (4115, 4008, 1010, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR), NOW(6)),
    (4116, 4008, 1011, DATE_SUB(NOW(6), INTERVAL 110 MINUTE), DATE_SUB(NOW(6), INTERVAL 110 MINUTE), NOW(6));

INSERT INTO games (
    id,
    room_id,
    status,
    started_at,
    completed_at,
    created_at,
    updated_at
)
VALUES
    (5001, 4001, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (5002, 4002, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 2 DAY), NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), NOW(6)),
    (5003, 4003, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 8 DAY), NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (5004, 4004, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (5005, 4005, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 8 DAY), NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (5006, 4006, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (5007, 4008, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 2 HOUR), NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), NOW(6));

INSERT INTO game_participants (
    id,
    game_id,
    member_id,
    joined_at,
    created_at,
    updated_at
)
VALUES
    (6001, 5001, 1001, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (6002, 5001, 1002, DATE_SUB(NOW(6), INTERVAL 23 HOUR), DATE_SUB(NOW(6), INTERVAL 23 HOUR), NOW(6)),
    (6003, 5001, 1003, DATE_SUB(NOW(6), INTERVAL 22 HOUR), DATE_SUB(NOW(6), INTERVAL 22 HOUR), NOW(6)),
    (6004, 5001, 1004, DATE_SUB(NOW(6), INTERVAL 21 HOUR), DATE_SUB(NOW(6), INTERVAL 21 HOUR), NOW(6)),
    (6005, 5002, 1001, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY), NOW(6)),
    (6006, 5002, 1002, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (6007, 5003, 1001, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (6008, 5003, 1003, DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY), NOW(6)),
    (6009, 5004, 1001, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (6010, 5004, 1004, DATE_SUB(NOW(6), INTERVAL 20 HOUR), DATE_SUB(NOW(6), INTERVAL 20 HOUR), NOW(6)),
    (6011, 5005, 1001, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (6012, 5005, 1005, DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY), NOW(6)),
    (6013, 5006, 1009, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (6014, 5007, 1010, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR), NOW(6)),
    (6015, 5007, 1011, DATE_SUB(NOW(6), INTERVAL 110 MINUTE), DATE_SUB(NOW(6), INTERVAL 110 MINUTE), NOW(6));

INSERT INTO bingo_boards (
    id,
    game_id,
    game_participant_id,
    board_type,
    board_size,
    target_bingo_count,
    target_step_count,
    status,
    completed_at,
    created_at,
    updated_at
)
VALUES
    (7001, 5001, NULL, 'SHARED', 3, NULL, 10000, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (7002, 5002, NULL, 'SHARED', 3, NULL, 8000, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), NOW(6)),
    (7003, 5003, NULL, 'SHARED', 3, NULL, 12000, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (7004, 5004, NULL, 'SHARED', 3, NULL, 9000, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (7005, 5005, NULL, 'SHARED', 3, NULL, 11000, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6)),
    (7006, 5006, NULL, 'SHARED', 3, NULL, 7000, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6)),
    (7007, 5007, 6014, 'PERSONAL', 3, 2, NULL, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), NOW(6)),
    (7008, 5007, 6015, 'PERSONAL', 3, 2, NULL, 'ACTIVE', NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), NOW(6));

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
    submit_url,
    created_at,
    updated_at
)
VALUES
    (8001, 7001, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 22 HOUR), DATE_SUB(NOW(6), INTERVAL 23 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Approved+Host', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 22 HOUR)),
    (8002, 7001, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 20 HOUR), DATE_SUB(NOW(6), INTERVAL 21 HOUR), 'APPROVED', NULL, 1002, 'https://placehold.co/512x512/png?text=Approved+Friend1', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 20 HOUR)),
    (8003, 7001, 2003, 0, 2, NULL, DATE_SUB(NOW(6), INTERVAL 19 HOUR), 'REJECTED', '미션 조건이 확인되지 않았습니다.', 1003, 'https://placehold.co/512x512/png?text=Rejected+Friend2', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 18 HOUR)),
    (8004, 7001, 2004, 1, 0, DATE_SUB(NOW(6), INTERVAL 17 HOUR), DATE_SUB(NOW(6), INTERVAL 18 HOUR), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Approved+Friend3', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 17 HOUR)),
    (8005, 7001, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8006, 7001, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8007, 7001, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8008, 7001, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8009, 7001, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),

    (8011, 7002, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 20 HOUR), DATE_SUB(NOW(6), INTERVAL 21 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Partial+Approved', DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 20 HOUR)),
    (8012, 7002, 2002, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8013, 7002, 2003, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8014, 7002, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8015, 7002, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8016, 7002, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8017, 7002, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8018, 7002, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8019, 7002, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),

    (8021, 7003, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Before+Deadline', DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY)),
    (8022, 7003, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), 'APPROVED', NULL, 1003, 'https://placehold.co/512x512/png?text=Before+Deadline+2', DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8023, 7003, 2003, 0, 2, NULL, DATE_SUB(NOW(6), INTERVAL 5 DAY), 'REJECTED', '미션 조건이 확인되지 않았습니다.', 1003, 'https://placehold.co/512x512/png?text=Expired+Rejected', DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (8024, 7003, 2004, 1, 0, DATE_SUB(NOW(6), INTERVAL 6 HOUR), DATE_SUB(NOW(6), INTERVAL 12 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=After+Deadline', DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 6 HOUR)),
    (8025, 7003, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8026, 7003, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8027, 7003, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8028, 7003, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8029, 7003, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),

    (8031, 7004, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 20 HOUR), DATE_SUB(NOW(6), INTERVAL 21 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Target+1', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 20 HOUR)),
    (8032, 7004, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 18 HOUR), DATE_SUB(NOW(6), INTERVAL 19 HOUR), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Target+2', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 18 HOUR)),
    (8033, 7004, 2003, 0, 2, DATE_SUB(NOW(6), INTERVAL 16 HOUR), DATE_SUB(NOW(6), INTERVAL 17 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Target+3', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 16 HOUR)),
    (8034, 7004, 2004, 1, 0, DATE_SUB(NOW(6), INTERVAL 15 HOUR), DATE_SUB(NOW(6), INTERVAL 16 HOUR), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Complete+4', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 15 HOUR)),
    (8035, 7004, 2005, 1, 1, DATE_SUB(NOW(6), INTERVAL 14 HOUR), DATE_SUB(NOW(6), INTERVAL 15 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Complete+5', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 14 HOUR)),
    (8036, 7004, 2006, 1, 2, DATE_SUB(NOW(6), INTERVAL 13 HOUR), DATE_SUB(NOW(6), INTERVAL 14 HOUR), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Complete+6', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 13 HOUR)),
    (8037, 7004, 2007, 2, 0, DATE_SUB(NOW(6), INTERVAL 12 HOUR), DATE_SUB(NOW(6), INTERVAL 13 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Complete+7', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 12 HOUR)),
    (8038, 7004, 2008, 2, 1, DATE_SUB(NOW(6), INTERVAL 11 HOUR), DATE_SUB(NOW(6), INTERVAL 12 HOUR), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Complete+8', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 11 HOUR)),
    (8039, 7004, 2009, 2, 2, DATE_SUB(NOW(6), INTERVAL 10 HOUR), DATE_SUB(NOW(6), INTERVAL 11 HOUR), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Complete+9', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 10 HOUR)),

    (8041, 7005, 2001, 0, 0, NULL, DATE_SUB(NOW(6), INTERVAL 2 DAY), 'PENDING', NULL, 1001, 'https://placehold.co/512x512/png?text=Pending', DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY)),
    (8042, 7005, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), 'APPROVED', NULL, 1005, 'https://placehold.co/512x512/png?text=Pending+Room+Approved', DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8043, 7005, 2003, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8044, 7005, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8045, 7005, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8046, 7005, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8047, 7005, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8048, 7005, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8049, 7005, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),

    (8051, 7006, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 12 HOUR), DATE_SUB(NOW(6), INTERVAL 13 HOUR), 'APPROVED', NULL, 1009, 'https://placehold.co/512x512/png?text=Single+Approved', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 12 HOUR)),
    (8052, 7006, 2002, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8053, 7006, 2003, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8054, 7006, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8055, 7006, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8056, 7006, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8057, 7006, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8058, 7006, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),
    (8059, 7006, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY)),

    (8061, 7007, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 70 MINUTE), DATE_SUB(NOW(6), INTERVAL 80 MINUTE), 'APPROVED', NULL, 1010, 'https://placehold.co/512x512/png?text=Battle+Host+1', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 70 MINUTE)),
    (8062, 7007, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 50 MINUTE), DATE_SUB(NOW(6), INTERVAL 60 MINUTE), 'APPROVED', NULL, 1010, 'https://placehold.co/512x512/png?text=Battle+Host+2', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 50 MINUTE)),
    (8063, 7007, 2003, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8064, 7007, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8065, 7007, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8066, 7007, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8067, 7007, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8068, 7007, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8069, 7007, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),

    (8071, 7008, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 75 MINUTE), DATE_SUB(NOW(6), INTERVAL 85 MINUTE), 'APPROVED', NULL, 1011, 'https://placehold.co/512x512/png?text=Battle+User+1', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 75 MINUTE)),
    (8072, 7008, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 55 MINUTE), DATE_SUB(NOW(6), INTERVAL 65 MINUTE), 'APPROVED', NULL, 1011, 'https://placehold.co/512x512/png?text=Battle+User+2', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 55 MINUTE)),
    (8073, 7008, 2003, 0, 2, DATE_SUB(NOW(6), INTERVAL 35 MINUTE), DATE_SUB(NOW(6), INTERVAL 45 MINUTE), 'APPROVED', NULL, 1011, 'https://placehold.co/512x512/png?text=Battle+User+3', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 35 MINUTE)),
    (8074, 7008, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8075, 7008, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8076, 7008, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8077, 7008, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8078, 7008, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (8079, 7008, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR));

INSERT INTO game_requests (
    id,
    room_id,
    inviter_id,
    invitee_id,
    status,
    created_at,
    updated_at
)
VALUES
    (9001, 4002, 1001, 1005, 'PENDING', DATE_SUB(NOW(6), INTERVAL 2 HOUR), DATE_SUB(NOW(6), INTERVAL 2 HOUR)),
    (9002, 4007, 1010, 1011, 'PENDING', DATE_SUB(NOW(6), INTERVAL 90 MINUTE), DATE_SUB(NOW(6), INTERVAL 90 MINUTE)),
    (9003, 4002, 1001, 1006, 'PENDING', DATE_SUB(NOW(6), INTERVAL 3 HOUR), DATE_SUB(NOW(6), INTERVAL 3 HOUR)),
    (9004, 4001, 1001, 1007, 'PENDING', DATE_SUB(NOW(6), INTERVAL 4 HOUR), DATE_SUB(NOW(6), INTERVAL 4 HOUR)),
    (9005, 4001, 1001, 1004, 'ACCEPTED', DATE_SUB(NOW(6), INTERVAL 21 HOUR), DATE_SUB(NOW(6), INTERVAL 21 HOUR)),
    (9006, 4002, 1001, 1007, 'DECLINED', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 20 HOUR));

INSERT INTO rooms (
    id,
    name,
    host_id,
    mode,
    status,
    target_bingo_count,
    target_step_count,
    board_size,
    created_at,
    updated_at
)
VALUES
    (4010, '대결 재대결방', 1010, 'BATTLE', 'ACTIVE', 1, NULL, 3, DATE_SUB(NOW(6), INTERVAL 6 DAY), NOW(6)),
    (4011, '4인 협력 성공 기록', 1001, 'COOPERATE', 'CLOSED', NULL, 10000, 3, DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (4012, '협력 실패 기록', 1001, 'COOPERATE', 'CLOSED', NULL, 12000, 3, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

INSERT INTO room_members (
    id,
    room_id,
    member_id,
    joined_at,
    created_at,
    updated_at
)
VALUES
    (4117, 4010, 1010, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), NOW(6)),
    (4118, 4010, 1011, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), NOW(6));

INSERT INTO games (
    id,
    room_id,
    status,
    started_at,
    completed_at,
    created_at,
    updated_at
)
VALUES
    (5101, 4010, 'ENDED', DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (5102, 4011, 'ENDED', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (5103, 4012, 'ENDED', DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

INSERT INTO game_participants (
    id,
    game_id,
    member_id,
    joined_at,
    created_at,
    updated_at
)
VALUES
    (6101, 5101, 1010, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (6102, 5101, 1011, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (6103, 5102, 1001, DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (6104, 5102, 1002, DATE_SUB(NOW(6), INTERVAL 9 DAY), DATE_SUB(NOW(6), INTERVAL 9 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (6105, 5102, 1003, DATE_SUB(NOW(6), INTERVAL 9 DAY), DATE_SUB(NOW(6), INTERVAL 9 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (6106, 5102, 1004, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (6107, 5103, 1001, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (6108, 5103, 1002, DATE_SUB(NOW(6), INTERVAL 11 DAY), DATE_SUB(NOW(6), INTERVAL 11 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

INSERT INTO bingo_boards (
    id,
    game_id,
    game_participant_id,
    board_type,
    board_size,
    target_bingo_count,
    target_step_count,
    status,
    completed_at,
    created_at,
    updated_at
)
VALUES
    (7101, 5101, 6101, 'PERSONAL', 3, 1, NULL, 'COMPLETED', DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (7102, 5101, 6102, 'PERSONAL', 3, 1, NULL, 'COMPLETED', DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (7103, 5102, NULL, 'SHARED', 3, NULL, 10000, 'COMPLETED', DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (7104, 5103, NULL, 'SHARED', 3, NULL, 12000, 'EXPIRED', DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

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
    submit_url,
    created_at,
    updated_at
)
VALUES
    (8101, 7101, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY), 'APPROVED', NULL, 1010, 'https://placehold.co/512x512/png?text=Battle+Winner+1', DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (8102, 7101, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY), 'APPROVED', NULL, 1010, 'https://placehold.co/512x512/png?text=Battle+Winner+2', DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (8103, 7101, 2003, 0, 2, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY), 'APPROVED', NULL, 1010, 'https://placehold.co/512x512/png?text=Battle+Winner+3', DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (8104, 7101, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8105, 7101, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8106, 7101, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8107, 7101, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8108, 7101, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8109, 7101, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),

    (8111, 7102, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY), 'APPROVED', NULL, 1011, 'https://placehold.co/512x512/png?text=Battle+Loser+1', DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (8112, 7102, 2002, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8113, 7102, 2003, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8114, 7102, 2004, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8115, 7102, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8116, 7102, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8117, 7102, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8118, 7102, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),
    (8119, 7102, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 6 DAY), DATE_SUB(NOW(6), INTERVAL 6 DAY)),

    (8121, 7103, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Coop+Host+1', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8122, 7103, 2002, 0, 1, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Coop+Host+2', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8123, 7103, 2003, 0, 2, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1002, 'https://placehold.co/512x512/png?text=Coop+Friend1+1', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8124, 7103, 2004, 1, 0, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Coop+Host+3', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8125, 7103, 2005, 1, 1, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1002, 'https://placehold.co/512x512/png?text=Coop+Friend1+2', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8126, 7103, 2006, 1, 2, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1003, 'https://placehold.co/512x512/png?text=Coop+Friend2+1', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8127, 7103, 2007, 2, 0, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1003, 'https://placehold.co/512x512/png?text=Coop+Friend2+2', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8128, 7103, 2008, 2, 1, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Coop+Friend3+1', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),
    (8129, 7103, 2009, 2, 2, DATE_SUB(NOW(6), INTERVAL 4 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY), 'APPROVED', NULL, 1004, 'https://placehold.co/512x512/png?text=Coop+Friend3+2', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 4 DAY)),

    (8131, 7104, 2001, 0, 0, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), 'APPROVED', NULL, 1001, 'https://placehold.co/512x512/png?text=Failed+Coop+1', DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY)),
    (8132, 7104, 2002, 0, 1, NULL, DATE_SUB(NOW(6), INTERVAL 7 DAY), 'REJECTED', '미션 조건이 확인되지 않았습니다.', 1002, 'https://placehold.co/512x512/png?text=Failed+Coop+Rejected', DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY)),
    (8133, 7104, 2003, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY)),
    (8134, 7104, 2004, 1, 0, DATE_SUB(NOW(6), INTERVAL 7 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY), 'APPROVED', NULL, 1002, 'https://placehold.co/512x512/png?text=Failed+Coop+2', DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 7 DAY)),
    (8135, 7104, 2005, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY)),
    (8136, 7104, 2006, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY)),
    (8137, 7104, 2007, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY)),
    (8138, 7104, 2008, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY)),
    (8139, 7104, 2009, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 12 DAY), DATE_SUB(NOW(6), INTERVAL 12 DAY));

INSERT INTO game_results (
    id,
    game_id,
    room_id,
    result,
    bingo_count,
    completed_mission_count,
    reward_cash,
    created_at,
    updated_at
)
VALUES
    (7201, 5101, 4010, true, 1, 3, 300, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (7202, 5102, 4011, true, 8, 9, 200, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (7203, 5103, 4012, false, 0, 2, 0, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));

INSERT INTO game_result_participants (
    id,
    game_id,
    member_id,
    completed_mission_count,
    reward_cash,
    result,
    created_at,
    updated_at
)
VALUES
    (7301, 5101, 1010, 3, 300, true, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (7302, 5101, 1011, 1, 50, false, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (7303, 5102, 1001, 3, 200, true, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (7304, 5102, 1002, 2, 200, true, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (7305, 5102, 1003, 2, 200, true, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (7306, 5102, 1004, 2, 200, true, DATE_SUB(NOW(6), INTERVAL 3 DAY), DATE_SUB(NOW(6), INTERVAL 3 DAY)),
    (7307, 5103, 1001, 1, 0, false, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY)),
    (7308, 5103, 1002, 1, 0, false, DATE_SUB(NOW(6), INTERVAL 5 DAY), DATE_SUB(NOW(6), INTERVAL 5 DAY));
