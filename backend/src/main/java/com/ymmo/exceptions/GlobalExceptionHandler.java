package com.ymmo.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.ymmo.response.GlobalResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleEmailExists(EmailAlreadyExistsException ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(InvalidUuidException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleInvalidUuid(InvalidUuidException ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ResourceNotFound.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleAgencyNotFound(ResourceNotFound ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleAgencyNotFound(InvalidCredentialsException ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.UNAUTHORIZED);
    }
}
