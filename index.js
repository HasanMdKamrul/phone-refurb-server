const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 15000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ** Middleware

app.use(cors());
app.use(express.json());

// ** Test Api
app.get("/", (req, res) => res.send("Server is running - phone-refurb"));

// ** verifyJWT -middleware

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log(authHeader);

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

const verifySeller = async (req, res, next) => {
  const emailDecoded = req.decoded.email;

  //   console.log(emailDecoded);

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
  //   console.log(isSeller);

  if (isSeller.role !== "seller") {
    return res.status(401).send({
      success: false,
      message: "Unauthorised access",
    });
  }

  next();
};
const verifyBuyer = async (req, res, next) => {
  const emailDecoded = req.decoded.email;

  //   console.log(emailDecoded);

  if (!emailDecoded) {
    return res.status(401).send({
      success: false,
      message: "unauthorised access",
    });
  }

  const filter = {
    email: emailDecoded,
  };

  const isBuyer = await userCollection.findOne(filter);
  //   console.log(isSeller);

  if (isBuyer.role !== "buyer") {
    return res.status(401).send({
      success: false,
      message: "Unauthorised access",
    });
  }

  next();
};
const verifyAdmin = async (req, res, next) => {
  const emailDecoded = req.decoded.email;

  //   console.log(emailDecoded);

  if (!emailDecoded) {
    return res.status(401).send({
      success: false,
      message: "unauthorised access",
    });
  }

  const filter = {
    email: emailDecoded,
  };

  const isAdmin = await userCollection.findOne(filter);
  //   console.log(isAdmin);

  if (isAdmin.role !== "admin") {
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
const orderCollection = client.db("phone-refurb-db").collection("orders");
const paymentCollection = client.db("phone-refurb-db").collection("payments");

// ** DB Collections

// *** Payments

// ** Stripe payment intent handle

app.post("/create-payment-intent", verifyJWT, verifyBuyer, async (req, res) => {
  const order = req.body;
  const price = order.price;

  // ** Need to convert it into cents
  const amount = price * 100;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// ** Saving Payment Information

app.post("/payments", verifyJWT, verifyBuyer, async (req, res) => {
  try {
    const payment = req.body;

    console.log(payment);

    const insertPayment = await paymentCollection.insertOne(payment);

    const orderId = payment.orderId;
    const transectionId = payment.transectionId;
    const price = payment.price;

    // ** Filtering the order and update for paid status
    const filter = {
      _id: ObjectId(orderId),
    };

    const updatedDoc = {
      $set: {
        transectionId: transectionId,
        paid: true,
      },
    };

    const orderUpdate = await orderCollection.updateOne(filter, updatedDoc);

    return res.send({
      success: true,
      data: insertPayment,
      orderData: orderUpdate,
    });
  } catch (error) {
    res.send({
      success: false,
      message: "Payment cann't be successfull",
    });
  }
});

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

    // console.log(adminUser);

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
    // console.log(req.query.email);

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

app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const role = req.query.role;
    // console.log(role);
    const filter = {
      role: role,
    };

    const sellerAndbuyers = await userCollection.find(filter).toArray();
    // console.log(sellerAndbuyers);

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

app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    // console.log(id);
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

app.post("/addproduct", verifyJWT, verifySeller, async (req, res) => {
  try {
    const productData = req.body;

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

app.get("/products", verifyJWT, verifySeller, async (req, res) => {
  try {
    const email = req.query.email;

    // console.log("query Email", email);

    // console.log("decoded", req.decoded.email);

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

app.get("/products/:id", verifyJWT, verifyBuyer, async (req, res) => {
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
// ** Delete a product which is reported

app.delete("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);

    const filter = {
      _id: ObjectId(id),
    };

    const result = await productCollection.deleteOne(filter);

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

// ** addvertiseproducts

app.put("/advertiseproducts/:id", verifyJWT, verifySeller, async (req, res) => {
  try {
    const id = req.params.id;

    const email = req.query.email;

    if (req.decoded.email !== email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorised access",
      });
    }

    const updatedProduct = req.body;
    console.log(updatedProduct);

    const filter = {
      _id: ObjectId(id),
    };

    const updatedDoc = {
      $set: {
        advertise: updatedProduct.advertise,
        report: updatedProduct.reported,
      },
    };

    const options = { upsert: true };

    const result = await productCollection.updateOne(
      filter,
      updatedDoc,
      options
    );

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

// ** Get all the advertise products

app.get("/advertiseproducts", verifyJWT, verifyBuyer, async (req, res) => {
  try {
    const advertise = req.query.advertise;

    // console.log(typeof advertise);

    const filter = {
      advertise,
    };

    const advertiseProducts = await productCollection.find(filter).toArray();
    // console.log(advertiseProducts);
    res.send(advertiseProducts);
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** get all reported products

app.get("/reportedproducts", async (req, res) => {
  try {
    const reported = req.query.reported;
    console.log(reported);

    const filter = {
      report: reported,
    };

    const reportedProducts = await productCollection.find(filter).toArray();

    console.log(reportedProducts);
    res.send(reportedProducts);
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** Seller verification

app.put("/sellerverify/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);
    const verifyStatus = req.body.verifyStatus;
    const filter = {
      _id: ObjectId(id),
    };

    const updatedDocument = {
      $set: {
        verifyStatus: verifyStatus,
      },
    };

    const options = { upsert: true };

    const verifySeller = await userCollection.updateOne(
      filter,
      updatedDocument,
      options
    );

    return res.send({
      success: true,
      data: verifySeller,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** seller verified data

app.get("/sellervirified", async (req, res) => {
  try {
    const email = req.query.email;

    const filter = {
      email: email,
    };

    const sellerData = await userCollection.findOne(filter);

    res.send(sellerData);
  } catch (error) {
    console.log(error.message);
  }
});

// ** Orders Apis

app.post("/orders", verifyJWT, verifyBuyer, async (req, res) => {
  try {
    const order = req.body;
    const email = order.buyerEmail;

    if (email !== req.decoded.email) {
      return res.send(401).send({
        success: false,
        message: "Unauthorised access",
      });
    }

    const result = await orderCollection.insertOne(order);
    res.send(result);
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// ** get the orders according to user email

app.get("/orders/:email", verifyJWT, verifyBuyer, async (req, res) => {
  try {
    const email = req.params.email;

    if (req.decoded.email !== email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorised access",
      });
    }

    console.log(email);

    const filter = {
      buyerEmail: email,
    };

    const orderedProducts = await orderCollection.find(filter).toArray();

    res.send(orderedProducts);
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
