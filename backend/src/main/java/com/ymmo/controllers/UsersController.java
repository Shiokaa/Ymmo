package com.ymmo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.ymmo.entities.Users;
import com.ymmo.services.UsersService;


@Controller
public class UsersController {
    
    @Autowired
    private UsersService usersService;

    @PostMapping("/register")
    public String register(@RequestBody Users user) {

        usersService.create(user);

        String str = "Utilisateur créé !" + user;
        return str;
    }
    

}
