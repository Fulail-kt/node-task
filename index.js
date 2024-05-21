const express = require('express');
const app = express();
const routes = require('./routes/route')
require('dotenv').config();

// Database Details

const DB_USER = process.env['DB_USER'];
const DB_PWD = process.env['DB_PWD'];
const DB_URL = process.env['DB_URL'];
const DB_NAME = "task-jeff";

// Database Connection

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://" + DB_USER + ":" + DB_PWD + "@" + DB_URL + "/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, }
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

// Endpoints

app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use(express.json())
app.use('/', routes)

const port = 3000;

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

run();