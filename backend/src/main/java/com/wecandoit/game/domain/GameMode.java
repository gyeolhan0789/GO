package com.wecandoit.game.domain;

public enum GameMode {
    SINGLE(1),
    COOPERATE(4),
    BATTLE(2);

    private final int maximumParticipants;

    GameMode(int maximumParticipants) {
        this.maximumParticipants = maximumParticipants;
    }

    public int getMaximumParticipants() {
        return maximumParticipants;
    }
}
