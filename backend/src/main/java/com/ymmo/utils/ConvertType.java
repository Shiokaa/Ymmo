package com.ymmo.utils;

import java.util.UUID;

import com.ymmo.exceptions.InvalidUuidException;

public class ConvertType {
    private ConvertType() {
    }

    public static UUID stringToUuid(String id) {
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw new InvalidUuidException();
        }
    }
}
