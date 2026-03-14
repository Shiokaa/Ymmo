package com.ymmo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.ymmo.entities.User;
import com.ymmo.services.UserService;


@Controller
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public String register(@RequestBody User user) {

        userService.create(user);

        String str = "Utilisateur créé !" + user;
        return str;
    }


}
