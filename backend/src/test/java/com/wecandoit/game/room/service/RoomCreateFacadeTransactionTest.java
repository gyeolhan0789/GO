package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.testcontainers.MySqlTestContainer;
import com.wecandoit.common.testcontainers.RedisTestContainer;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.RoomCreateFacade;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
@ImportTestcontainers({MySqlTestContainer.class, RedisTestContainer.class})
@DisplayName("게임방 생성 트랜잭션")
class RoomCreateFacadeTransactionTest {

    @Autowired
    private RoomCreateFacade roomCreateFacade;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private GameParticipantRepository gameParticipantRepository;
    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private BingoCellRepository bingoCellRepository;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private MissionRepository missionRepository;

    @MockitoBean
    private RoomReadService roomReadService;

    @BeforeEach
    void setUp() {
        clearPersistedData();
    }

    @Test
    @DisplayName("생성 후 상세 조회에 실패하면 방과 회차 데이터를 모두 롤백한다")
    void createRoomRollsBackWhenDetailReadFails() {
        Member member = memberRepository.save(Member.create(
                "host@example.com",
                "encoded-password",
                "방장",
                null,
                Gender.MALE
        ));
        saveMissions(9);
        given(roomReadService.getRoomDetail(eq(member.getId()), anyLong()))
                .willThrow(new IllegalStateException("detail read failed"));

        assertThatThrownBy(() -> roomCreateFacade.createRoom(
                member.getId(),
                new CreateRoomRequest("협동 방", GameMode.COOPERATE, 1, 10_000, 3)
        )).isInstanceOf(IllegalStateException.class);

        assertThat(roomRepository.count()).isZero();
        assertThat(roomMemberRepository.count()).isZero();
        assertThat(gameRepository.count()).isZero();
        assertThat(gameParticipantRepository.count()).isZero();
        assertThat(bingoBoardRepository.count()).isZero();
        assertThat(bingoCellRepository.count()).isZero();
    }

    @AfterEach
    void tearDown() {
        clearPersistedData();
    }

    private void clearPersistedData() {
        bingoCellRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameParticipantRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();
        missionRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    @DisplayName("미션이 부족하면 방과 회차 데이터를 모두 롤백한다")
    void createRoomRollsBackWhenMissionPoolIsInsufficient() {
        Member member = memberRepository.save(Member.create(
                "host@example.com",
                "encoded-password",
                "방장",
                null,
                Gender.MALE
        ));

        assertThatThrownBy(() -> roomCreateFacade.createRoom(
                member.getId(),
                new CreateRoomRequest("협동 방", GameMode.COOPERATE, 1, 10_000, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.MISSION_POOL_INSUFFICIENT);

        assertThat(roomRepository.count()).isZero();
        assertThat(roomMemberRepository.count()).isZero();
        assertThat(gameRepository.count()).isZero();
        assertThat(gameParticipantRepository.count()).isZero();
        assertThat(bingoBoardRepository.count()).isZero();
        assertThat(bingoCellRepository.count()).isZero();
    }

    private void saveMissions(int count) {
        missionRepository.saveAll(IntStream.range(0, count)
                .mapToObj(index -> Mission.create(
                        "https://example.com/mission-" + index + ".png",
                        MissionType.OBJECT,
                        "미션 " + index,
                        "설명",
                        null
                ))
                .toList());
    }
}
