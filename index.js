const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 15000;
const jwt = require("jsonwebtoken");
// const jwt = require("jsonwebtoken");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ** Middleware

app.use(cors());
app.use(express.json());

// ** Test Api
app.get("/", (req, res) => res.send("Server is running - phone-refurb"));

// ** verifyJWT -middleware

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({
      success: false,
      message: "Unauthorised access",
    });
  }

  // ** verify token
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        success: false,
        message: "Unauthorised access",
      });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

const verifyAdmin = async (req, res, next) => {
  const emailDecoded = req.decoded.email;

  console.log(emailDecoded);

  if (!emailDecoded) {
    return res.status(401).send({
      success: false,
      message: "unauthorised access",
    });
  }

  const filter = {
    email: emailDecoded,
  };

  const isSeller = await userCollection.findOne(filter);
  console.log(isSeller);

  if (isSeller.role !== "seller") {
    return res.status(401).send({
      success: false,
      message: "Unauthorised access",
    });
  }

  next();
};

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
const productCollection = client.db("phone-refurb-db").collection("products");
const userCollection = client.db("phone-refurb-db").collection("users");

// ** DB Collections

// ** DB RUN

// ** APIS ********

// ** Users Apis

// ** Creating users
app.put("/users", async (req, res) => {
  try {
    const userData = req.body;
    const email = userData.email;
    const filter = {
      email: email,
    };
    const updatedDoc = {
      $set: userData,
    };

    const options = { upsert: true };

    const adminUser = await userCollection.findOne(filter);

    console.log(adminUser);

    if (adminUser && adminUser.role === "admin") {
      return;
    }

    const user = await userCollection.updateOne(filter, updatedDoc, options);

    return res.send({
      success: true,
      data: user,
      message: "User created successfully",
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** Get a single user role

app.get("/usersrole", async (req, res) => {
  try {
    console.log(req.query.email);

    const email = req.query.email;
    const filter = {
      email: email,
    };

    const user = await userCollection.findOne(filter);

    return res.send({
      success: true,
      data: user.role,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** get all seller user and all buyer user

app.get("/users", async (req, res) => {
  try {
    const role = req.query.role;
    console.log(role);
    const filter = {
      role: role,
    };

    const sellerAndbuyers = await userCollection.find(filter).toArray();
    console.log(sellerAndbuyers);

    return res.send({
      success: true,
      data: sellerAndbuyers,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** Delete seller or buyer

app.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);
    const filter = {
      _id: ObjectId(id),
    };
    const result = await userCollection.deleteOne(filter);
    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// **** Category Apis

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
// **** Category Apis

// ** Products Apis -> Add product

app.post("/addproduct", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const productData = req.body;

    if (productData.sellerEmail !== req.decoded.email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorised access",
      });
    }

    const result = await productCollection.insertOne(productData);
    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** Get All Seller products

app.get("/products", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const email = req.query.email;

    console.log(req.decoded.email);

    if (req.decoded.email !== email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorised access",
      });
    }

    const filter = {
      sellerEmail: email,
    };

    const products = await productCollection.find(filter).toArray();

    return res.send({
      success: true,
      data: products,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** get products using product category id

app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      productCategoryId: id,
    };

    const products = await productCollection.find(query).toArray();

    return res.send({
      success: true,
      data: products,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// *** JWT GENERATION ****

// ** generate jwt

app.get("/jwt", async (req, res) => {
  try {
    const email = req.query.email;

    const payload = {
      email: email,
    };

    const filter = {
      email: email,
    };

    const userExisted = await userCollection.findOne(filter);

    if (!userExisted) {
      return res.status(401).send({
        success: false,
        message: `Unauthorised acccess`,
      });
    }

    const token = jwt.sign(payload, process.env.ACCESS_SECRET_TOKEN);

    return res.send({
      success: true,
      token,
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
