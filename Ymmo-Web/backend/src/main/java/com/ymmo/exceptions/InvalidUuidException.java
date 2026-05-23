package com.ymmo.exceptions;

public class InvalidUuidException extends RuntimeException {
    public InvalidUuidException() {
        super("INVALIDE_UUID");
    }
}
