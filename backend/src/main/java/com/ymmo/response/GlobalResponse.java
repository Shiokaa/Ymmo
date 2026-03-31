package com.ymmo.response;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonPropertyOrder({ "success", "timestamp", "message", "data" })
public class GlobalResponse<T> {
    private T data;
    private String message;
    private Boolean success;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime timestamp;

    public GlobalResponse(T data, String message, Boolean success) {
        this.data = data;
        this.message = message;
        this.success = success;
        this.timestamp = LocalDateTime.now();
    }

    public static <T> GlobalResponse<T> success(T data) {
        return new GlobalResponse<>(data, null, true);
    }

    public static <T> GlobalResponse<T> error(String message) {
        return new GlobalResponse<>(null, message, false);
    }
}
