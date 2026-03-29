package com.ymmo.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.ymmo.response.GlobalResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleEmailExists(EmailAlreadyExistsException ex){
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.CONFLICT);
    }
}
