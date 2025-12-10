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

    // GET a book by id
    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ _id: new ObjectId(id) });
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
