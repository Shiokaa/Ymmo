package com.ymmo.exceptions;

public class BadRequestException extends RuntimeException {
    public BadRequestException() {
        super("BAD_REQUEST");
    }

    public BadRequestException(String message) {
        super(message);
    }
}
