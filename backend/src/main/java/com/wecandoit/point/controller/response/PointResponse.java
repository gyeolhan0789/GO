package com.wecandoit.point.controller.response;

public record PointResponse(
        long point
) {

    public static PointResponse of(long point) {
        return new PointResponse(point);
    }
}
