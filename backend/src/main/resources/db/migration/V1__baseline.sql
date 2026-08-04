SET FOREIGN_KEY_CHECKS=0;
CREATE TABLE `bingo_boards` (
  `board_size` int NOT NULL,
  `target_bingo_count` int DEFAULT NULL,
  `target_step_count` int DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `game_id` bigint NOT NULL,
  `game_participant_id` bigint DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `board_type` enum('PERSONAL','SHARED') NOT NULL,
  `status` enum('ACTIVE','COMPLETED','EXPIRED') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKjvruwoheigjhiu3ry9kwebyww` (`game_participant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `bingo_cells` (
  `col_index` int NOT NULL,
  `row_index` int NOT NULL,
  `board_id` bigint NOT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint DEFAULT NULL,
  `mission_id` bigint NOT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `submit_url` varchar(255) DEFAULT NULL,
  `verification_status` enum('APPROVED','PENDING','REJECTED') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bingo_cells_position_board` (`row_index`,`col_index`,`board_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `default_avatar_assets` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `image_url` varchar(2048) NOT NULL,
  `gender` enum('FEMALE','MALE') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKs43ehpi5p8s9o8iavhx33sguo` (`gender`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `friend_requests` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `invitee_id` bigint NOT NULL,
  `inviter_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `status` enum('ACCEPTED','PENDING','REJECTED') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKj28hwiqvxb4ow6v3b01i0ul9y` (`invitee_id`),
  KEY `FKuncmrth79p1nhcgofhx50jy3` (`inviter_id`),
  CONSTRAINT `FKj28hwiqvxb4ow6v3b01i0ul9y` FOREIGN KEY (`invitee_id`) REFERENCES `member` (`id`),
  CONSTRAINT `FKuncmrth79p1nhcgofhx50jy3` FOREIGN KEY (`inviter_id`) REFERENCES `member` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `friends` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member1_id` bigint NOT NULL,
  `member2_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_friends_member1_member2` (`member1_id`,`member2_id`),
  KEY `FKmat3iqg1r4u42grh3yfgufmwk` (`member2_id`),
  CONSTRAINT `FKhue3mfs3fe30xytfrah9jar02` FOREIGN KEY (`member1_id`) REFERENCES `member` (`id`),
  CONSTRAINT `FKmat3iqg1r4u42grh3yfgufmwk` FOREIGN KEY (`member2_id`) REFERENCES `member` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `game_participants` (
  `created_at` datetime(6) DEFAULT NULL,
  `game_id` bigint NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `joined_at` datetime(6) NOT NULL,
  `member_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_game_participants_game_member` (`game_id`,`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `game_requests` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `invitee_id` bigint NOT NULL,
  `inviter_id` bigint NOT NULL,
  `room_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `status` enum('ACCEPTED','CANCELED','DECLINED','PENDING') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `game_result_participants` (
  `completed_mission_count` int NOT NULL,
  `result` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `game_id` bigint NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `reward_point` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_game_result_participants_game_member` (`game_id`,`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `game_results` (
  `bingo_count` int NOT NULL,
  `completed_mission_count` int NOT NULL,
  `result` bit(1) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `game_id` bigint NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reward_point` bigint NOT NULL,
  `room_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK7ddvvhe8div3x740a64r728kr` (`game_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `games` (
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `started_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `status` enum('ACTIVE','ENDED') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `items` (
  `available_for_sale` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `price` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `image_url` varchar(2048) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `member` (
  `onboarding_completed` bit(1) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `point` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `nickname` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `fcm_token` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `auth_provider` enum('GOOGLE','KAKAO','LOCAL') DEFAULT NULL,
  `gender` enum('FEMALE','MALE') NOT NULL,
  `region` enum('BUSAN','CHUNGBUK','CHUNGNAM','DAEGU','DAEJEON','GANGWON','GWANGJU','GYEONGBUK','GYEONGGI','GYEONGNAM','INCHEON','JEJU','JEONBUK','JEONNAM','SEJONG','SEOUL','ULSAN') DEFAULT NULL,
  `role` enum('ADMIN','USER') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKhh9kg6jti4n1eoiertn2k6qsc` (`nickname`),
  UNIQUE KEY `UKmbmcqelty0fbrvxp1q58dn57t` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `member_equipped_items` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `member_items_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `category` enum('ACCESSORY','BOTTOM','HAT','SHOES','SUNGLASSES','TOP') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_member_equipped_items_member_category` (`member_id`,`category`),
  UNIQUE KEY `UKrhvll0c606v8fsh7ns6y22v63` (`member_items_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `member_histories` (
  `calories` int NOT NULL,
  `distance` int NOT NULL,
  `history_date` date NOT NULL,
  `step` int NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_member_histories_member_history_date` (`member_id`,`history_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `member_items` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `missions` (
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `difficulty` varchar(20) NOT NULL DEFAULT 'MEDIUM',
  `type` varchar(50) NOT NULL,
  `mission_image_url` varchar(2048) NOT NULL,
  `decision_condition` json DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `notification` (
  `is_read` bit(1) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `body` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('BATTLE_RESULT','FRIEND_INVITE','FRIEND_REQUEST','REWARD_EARNED','WALK_START','WEEKLY_BINGO_RENEWAL') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `point_histories` (
  `amount` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `reference_id` bigint NOT NULL,
  `room_id` bigint DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `item_name` varchar(100) DEFAULT NULL,
  `transaction_type` enum('BINGO_CELL_REWARD','DAILY_STEP_GOAL_REWARD','GAME_GOAL_REWARD','ITEM_PURCHASE') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_point_histories_member_type_reference` (`member_id`,`transaction_type`,`reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `room_members` (
  `created_at` datetime(6) DEFAULT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `joined_at` datetime(6) NOT NULL,
  `member_id` bigint NOT NULL,
  `room_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `rooms` (
  `board_size` int NOT NULL,
  `target_bingo_count` int DEFAULT NULL,
  `target_step_count` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `host_id` bigint NOT NULL,
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(20) DEFAULT NULL,
  `mode` enum('BATTLE','COOPERATE','SINGLE') NOT NULL,
  `status` enum('ACTIVE','CLOSED') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
SET FOREIGN_KEY_CHECKS=1;
