package com.ymmo.hashing;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BCryptHashing implements Hashable {

    private final BCryptPasswordEncoder encoder;

    public BCryptHashing(BCryptPasswordEncoder encoder) {
        this.encoder = encoder;
    }

    public String bcryptHash(String password) {
        return encoder.encode(password);
    }
}
