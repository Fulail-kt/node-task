const express = require ('express')
const route=express.Router()
const controller=require('../controllers/controller')
const { check } = require('express-validator');

// to validate the input from the user
const validateTeam = [
    check('teamName').notEmpty().withMessage('Team name is required'),
    check('players').isArray({ min: 11, max: 11 }).withMessage('Players must be 11 '),
    check('captain').notEmpty().withMessage('Captain is required'),
    check('viceCaptain').notEmpty().withMessage('Vice-Captain is required')
  ];


// Routes 

// to create team
route.post('/add-team',validateTeam,controller.createTeam );

//to calculate points
route.post('/result',controller.calculatePoints);

//to get the results
route.get('/result', controller.getResult);

module.exports=route