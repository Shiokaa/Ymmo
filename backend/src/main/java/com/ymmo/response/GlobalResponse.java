package com.ymmo.response;

import java.time.Instant;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GlobalResponse<T> {
    private T data;
    private String message;
    private Boolean success;
    private Instant timestamp;

    public GlobalResponse(T data, String message, Boolean success, Instant timestamp) {
        this.data = data;
        this.message = message;
        this.success = success;
        this.timestamp = timestamp;
    }

    public static <T> GlobalResponse<T> success(T data) {
        return new GlobalResponse<>(data, null, true, Instant.now());
    }

    public static <T> GlobalResponse<T> error(String message) {
        return new GlobalResponse<>(null, message, false, Instant.now());
    }
}
