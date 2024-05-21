const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs')
const { check, validationResult } = require('express-validator');
require('dotenv').config();
// Database Details
const DB_USER = process.env['DB_USER'];
const DB_PWD = process.env['DB_PWD'];
const DB_URL = process.env['DB_URL'];
const DB_NAME = "task-jeff";
const DB_COLLECTION_NAME = "players";

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://"+DB_USER+":"+DB_PWD+"@"+DB_URL+"/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    db = client.db(DB_NAME);
    
    console.log("You successfully connected to MongoDB!");
    
  } finally {
  }
}


// // Sample create document
// async function sampleCreate() {
//   const demo_doc = { 
//     "demo": "doc demo",
//     "hello": "world"
//   };
//   const demo_create = await db.collection(DB_COLLECTION_NAME).insertOne(demo_doc);
  
//   console.log("Added!")
//   console.log(demo_create.insertedId);
// }

const playersData = JSON.parse(fs.readFileSync('./data/players.json'));
const matchData = JSON.parse(fs.readFileSync('./data/match.json'));

// console.log(playersData,matchData)

const validateTeam = [
  check('teamName').notEmpty().withMessage('Team name is required'),
  check('players').isArray({ min: 11, max: 11 }).withMessage('Players must be 11 '),
  check('captain').notEmpty().withMessage('Captain is required'),
  check('viceCaptain').notEmpty().withMessage('Vice-Captain is required')
];

function validateTeamRoles(players, captain, viceCaptain) {
  if (!players.includes(captain) || !players.includes(viceCaptain)) {
    throw new Error('Captain and Vice-Captain must be part of the team');
  }

  const teamRoles = { WICKETKEEPER: 0, BATTER: 0, ALL_ROUNDER: 0, BOWLER: 0 };

  players.forEach(playerName => {
    const player = playersData.find(p => p.Player === playerName);
    if (player) {
      const role = player.Role === "ALL-ROUNDER" ? "ALL_ROUNDER" : player.Role;
      teamRoles[role]++;
    }
  });

  if (teamRoles.WICKETKEEPER < 1 || teamRoles.WICKETKEEPER > 8 ||
    teamRoles.BATTER < 1 || teamRoles.BATTER > 8 ||
    teamRoles.ALL_ROUNDER < 1 || teamRoles.ALL_ROUNDER > 8 ||
    teamRoles.BOWLER < 1 || teamRoles.BOWLER > 8) {
  throw new Error('Invalid player selection');
}
}

// Endpoints


app.use(express.json())

app.post('/add-team', validateTeam, async (req, res) => {

  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { teamName, players, captain, viceCaptain } = req.body;

  try {
    validateTeamRoles(players, captain, viceCaptain);

    const team = { teamName, players, captain, viceCaptain, points: 0 };

    await db.collection(DB_COLLECTION_NAME).insertOne(team);
    res.status(201).json({ message: 'Team added successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


//

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

run();