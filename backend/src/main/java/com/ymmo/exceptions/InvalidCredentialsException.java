package com.ymmo.exceptions;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("INVALID_CREDENTIALS");
    }
}