package com.wecandoit.mission.domain;

/**
 * Partition of the mission pool used to compose a bingo board: the photo verification axis
 * crossed with the difficulty axis.
 */
public record MissionBucket(boolean photoVerified, MissionDifficulty difficulty) {

    public static MissionBucket of(MissionType type, MissionDifficulty difficulty) {
        return new MissionBucket(type.isPhotoVerified(), difficulty);
    }
}
