package com.ymmo.exceptions;

public class AgencyNotFoundException extends RuntimeException {
    public AgencyNotFoundException() {
        super("AGENCY_NOT_FOUND");
    }
}
