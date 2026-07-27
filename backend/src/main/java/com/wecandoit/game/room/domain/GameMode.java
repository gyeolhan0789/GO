package com.wecandoit.game.room.domain;

public enum GameMode {
    SINGLE(1, 1),
    COOPERATE(2, 4);

    private final int minimumParticipants;
    private final int maximumParticipants;

    GameMode(int minimumParticipants, int maximumParticipants) {
        this.minimumParticipants = minimumParticipants;
        this.maximumParticipants = maximumParticipants;
    }

    public int getMinimumParticipants() {
        return minimumParticipants;
    }

    public int getMaximumParticipants() {
        return maximumParticipants;
    }
}
