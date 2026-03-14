package com.ymmo.repositories;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ymmo.entities.Users;

public interface UsersRepository extends JpaRepository<Users, UUID> {

}
