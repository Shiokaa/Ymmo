package com.ymmo.exceptions;

public class ResourceNotFound extends RuntimeException {
    public ResourceNotFound() {
        super("RESOURCE_NOT_FOUND");
    }
}
