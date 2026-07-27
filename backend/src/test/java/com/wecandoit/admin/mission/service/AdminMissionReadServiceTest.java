package com.wecandoit.admin.mission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.wecandoit.admin.mission.controller.response.AdminMissionResponse;
import com.wecandoit.admin.mission.repository.AdminMissionRepository;
import com.wecandoit.mission.domain.Mission;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("미션 조회 서비스")
@ExtendWith(MockitoExtension.class)
class AdminMissionReadServiceTest {

    @Mock
    private AdminMissionRepository adminMissionRepository;
    private AdminMissionReadService adminMissionReadService;

    @BeforeEach
    void setUp() {
        adminMissionReadService = new AdminMissionReadService(adminMissionRepository);
    }

    @Test
    @DisplayName("최신순 미션 목록을 응답으로 변환한다")
    void getMissionsMapsRepositoryResults() {
        // given
        Mission mission = Mission.create("https://example.com/new.png", "OBJECT", "새 미션", null, null);
        ReflectionTestUtils.setField(mission, "id", 2L);
        ReflectionTestUtils.setField(mission, "createdAt", LocalDateTime.of(2026, 7, 22, 12, 0));
        given(adminMissionRepository.findAllByOrderByCreatedAtDescIdDesc()).willReturn(List.of(mission));

        // when
        List<AdminMissionResponse> responses = adminMissionReadService.getMissions();

        // then
        assertThat(responses).extracting(AdminMissionResponse::missionId).containsExactly(2L);
        assertThat(responses.getFirst().createdAt()).isEqualTo(LocalDateTime.of(2026, 7, 22, 12, 0));
    }
}
