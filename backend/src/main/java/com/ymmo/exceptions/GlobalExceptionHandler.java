package com.ymmo.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.ymmo.response.GlobalResponse;

import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice
@Slf4j
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
    public ResponseEntity<GlobalResponse<HttpStatus>> handleRessourceNotFound(ResourceNotFound ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleInvalidCredentialsNotFound(InvalidCredentialsException ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleBadRequest(BadRequestException ex) {
        return new ResponseEntity<>(GlobalResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleValidationError(MethodArgumentNotValidException ex) {
        var fieldError = ex.getBindingResult().getFieldError();
        String message;
        if (fieldError != null) {
            message = String.format("Validation error on '%s': %s", fieldError.getField(),
                    fieldError.getDefaultMessage());
        } else {
            message = "Validation error in the request";
        }
        return new ResponseEntity<>(GlobalResponse.error(message), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<GlobalResponse<HttpStatus>> handleGenericException(Exception ex) {
        log.error("An internal server error occurred", ex);
        return new ResponseEntity<>(GlobalResponse.error("An internal server error occurred"),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
