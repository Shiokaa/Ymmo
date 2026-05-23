package com.ymmo.exceptions;

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException() {
        super("EMAIL_ALREADY_EXISTS");
    }
}
