// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 15000;
// const jwt = require("jsonwebtoken");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ** Middleware

app.use(cors());
app.use(express.json());

// ** Test Api
app.get("/", (req, res) => res.send("Server is running - phone-refurb"));

// ** app listen

app.listen(port, () => console.log(`Server is running at ${port}`));
