const fs = require('fs')
const { validationResult } = require('express-validator');

// Reading the Json files

const playersData = JSON.parse(fs.readFileSync('./data/players.json'));
const matchData = JSON.parse(fs.readFileSync('./data/match.json'));



// To validate the team selection

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


// to Create team

const createTeam = async (req, res) => {
    const db = req.db
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { teamName, players, captain, viceCaptain } = req.body;

    try {
        validateTeamRoles(players, captain, viceCaptain);

        const team = { teamName, players, captain, viceCaptain, points: 0 };

        await db.collection(process.env.DB_NAME).insertOne(team);
        res.status(201).json({ message: 'Team added successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}



//To calculate Points

const calculatePoints = async (req, res) => {
    try {
        const db = req.db
        const teams = await db.collection(process.env.DB_NAME).find().toArray();
        const playerPoints = {};

        matchData.forEach(ball => {
            const { batter, bowler, isWicketDelivery, batsman_run, kind, fielders_involved } = ball;

            if (!playerPoints[batter]) {
                playerPoints[batter] = 0;
            }
            if (!playerPoints[bowler]) {
                playerPoints[bowler] = 0;
            }

            playerPoints[batter] += batsman_run;

            if (batsman_run === 4) {
                playerPoints[batter] += 1;
            }
            if (batsman_run === 6) {
                playerPoints[batter] += 2;
            }

            if (isWicketDelivery) {
                playerPoints[bowler] += 25;
                if (kind === 'lbw' || kind === 'bowled') playerPoints[bowler] += 8;

                if (fielders_involved !== 'NA') {
                    fielders_involved.split(',').forEach(fielder => {
                        if (!playerPoints[fielder]) playerPoints[fielder] = 0;
                        playerPoints[fielder] += 8;
                    });
                }
            }
        });

        await Promise.all(teams.map(async team => {
            let totalPoints = 0;

            team.players.forEach(playerName => {
                let points = playerPoints[playerName] || 0;
                if (playerName === team.captain) points *= 2;
                if (playerName === team.viceCaptain) points *= 1.5;
                totalPoints += points;
            });

            team.points = totalPoints;
            await db.collection(process.env.DB_NAME).updateOne({ _id: team._id }, { $set: { points: totalPoints } });
        }));

        res.status(200).json({ message: 'Results processed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



// to get calculated Points

const getResult = async (req, res) => {
    try {
        const db = req.db

        const teams = await db.collection(process.env.DB_NAME).find().sort({ points: -1 }).toArray();
        const topScore = teams.length > 0 ? teams[0].points : 0;
        const winners = teams.filter(team => team.points === topScore);
        res.status(200).json(winners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



module.exports = {
    createTeam,
    calculatePoints,
    getResult
}