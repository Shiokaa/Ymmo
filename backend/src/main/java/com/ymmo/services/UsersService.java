package com.ymmo.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.ymmo.entities.Users;
import com.ymmo.repositories.UsersRepository;

@Component
public class UsersService {
    
    @Autowired
    private UsersRepository repositories;

    public void create(Users user) {

        repositories.save(user);
    }

}
