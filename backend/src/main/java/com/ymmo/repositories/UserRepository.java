package com.ymmo.repositories;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ymmo.entities.User;


public interface UserRepository extends JpaRepository<User, UUID> {
    User findByEmail(String email);
}
