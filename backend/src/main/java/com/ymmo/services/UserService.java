package com.ymmo.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.ymmo.entities.User;
import com.ymmo.repositories.UserRepository;

@Component
public class UserService {

    @Autowired
    private UserRepository repositories;

    public void create(User user) {

        repositories.save(user);
    }

}
