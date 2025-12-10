require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const port = 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

// ------------------ FIREBASE ADMIN SETUP ------------------
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ------------------ MIDDLEWARE ------------------
app.use(
  cors({
    origin: [process.env.CLIENT_DOMAIN],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());

// ------------------ MONGODB CONNECTION ------------------
const uri = `mongodb+srv://${process.env.MongoUser}:${process.env.MongoPass}@simple.v1mki5f.mongodb.net/?retryWrites=true&w=majority&appName=simple`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ------------------ RUN FUNCTION ------------------
async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");

    const db = client.db("booksDB");
    const booksCollection = db.collection("books");
    const ordersCollection = db.collection("orders");

    // ADD a book
    app.post("/books", async (req, res) => {
      const bookData = req.body;
      const result = await booksCollection.insertOne(bookData);
      res.send(result);
    });

    // GET all books
    app.get("/books", async (req, res) => {
      const result = await booksCollection.find().toArray();
      res.send(result);
    });

    // Get latest 6 books
    app.get("/books/latest", async (req, res) => {
      const latestBooks = await booksCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(latestBooks);
    });

    // GET a book by id
    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // GET books by seller email
    app.get("/my-books/:email", async (req, res) => {
      const email = req.params.email;
      const result = await booksCollection
        .find({ "seller.email": email })
        .toArray();
      res.send(result);
    });

    // ------------------ 🟢 UPDATE a book ------------------
    app.put("/books/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updatedData,
        }
      );

      res.send(result);
    });

    // add a order
    app.post("/orders", async (req, res) => {
      const bookData = req.body;
      const result = await ordersCollection.insertOne(bookData);
      res.send(result);
    });

    //get order
    app.get("/orders", async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.send(result);
    });

    // GET orders by seller email
    app.get("/my-books-orders/:email", async (req, res) => {
      const email = req.params.email;
      const result = await ordersCollection
        .find({ sellerEmail: email })
        .toArray();
      res.send(result);
    });

    // GET orders by user email
    app.get("/my-orders/:email", async (req, res) => {
      const email = req.params.email;
      const result = await ordersCollection
        .find({ customerEmail: email })
        .toArray();
      res.send(result);
    });

    // Update order status
    app.patch("/orders/:id", async (req, res) => {
      try {
        const orderId = req.params.id;
        const { status } = req.body;

        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { status } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Order not found or status unchanged" });
        }

        res.send({ message: "Order status updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Cancel (delete) an order
    app.delete("/orders/:id", async (req, res) => {
      try {
        const orderId = req.params.id;

        const result = await ordersCollection.deleteOne({
          _id: new ObjectId(orderId),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Order not found" });
        }

        res.send({ message: "Order cancelled successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // -------------------------------------------------------
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
  }
}

run();

// ------------------ ROOT ROUTE ------------------
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ------------------ LISTEN ------------------
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
