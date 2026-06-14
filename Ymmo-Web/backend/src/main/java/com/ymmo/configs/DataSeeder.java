package com.ymmo.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.ymmo.entities.User;
import com.ymmo.enums.UserRole;
import com.ymmo.repositories.UserRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Amorce un compte ADMIN au démarrage s'il n'existe pas encore.
 * Identifiants configurables via les variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD.
 */
@Component
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_EMAIL:admin@ymmo.fr}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:Admin123!}")
    private String adminPassword;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(adminEmail).isPresent()) {
            return;
        }

        User admin = User.builder()
                .firstName("Admin")
                .lastName("Ymmo")
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .phone("0000000000")
                .role(UserRole.ADMIN)
                .build();

        userRepository.save(admin);
        log.info("Compte ADMIN initial créé : {}", adminEmail);
    }
}
