INSERT INTO member (email, password, nickname, cash, onboarding_completed, role, auth_provider)
VALUES (
    'admin@wecandoit.local',
    '$2a$10$XmfxK2TUdBocD4Pq9Bms7OIDfJmE1d4tc9ScXVVGSJWNQ0L5LXTty',
    '로컬관리자',
    0,
    false,
    'ADMIN',
    'LOCAL'
)
ON DUPLICATE KEY UPDATE role = 'ADMIN';
