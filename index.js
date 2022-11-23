const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

// ********* DB CONNECTION *********

const uri = `${process.env.DB_URI}`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// ** DB RUN
const run = async () => {
  try {
    await client.connect();
    console.log("DB Connected");
  } finally {
  }
};
run().catch((error) => console.log(error.message));

// ** DB Collections

const categoryCollection = client
  .db("phone-refurb-db")
  .collection("categories");

// ** DB Collections

// ** DB RUN

// ** APIS ********

app.get("/categories", async (req, res) => {
  try {
    const query = {};
    const categories = await categoryCollection.find(query).toArray();
    return res.send({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** APIS ********

// ** app listen
app.listen(port, () => console.log(`Server is running at ${port}`));
