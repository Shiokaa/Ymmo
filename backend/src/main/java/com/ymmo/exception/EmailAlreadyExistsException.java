package com.ymmo.exception;

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException() {
        super("EMAIL_ALREADY_EXISTS");
    }
}
