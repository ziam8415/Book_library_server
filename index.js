require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const port = 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  console.log(token);
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    console.log(decoded);
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: "Unauthorized Access!", err });
  }
};

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
    const usersCollection = db.collection("user");
    const wishlistCollection = db.collection("wishList");

    // save or update a user in db
    app.post("/user", async (req, res) => {
      const userData = req.body;
      userData.created_at = new Date().toISOString();
      userData.last_loggedIn = new Date().toISOString();
      userData.role = "customer";

      const query = {
        email: userData.email,
      };

      const alreadyExists = await usersCollection.findOne(query);

      if (alreadyExists) {
        const result = await usersCollection.updateOne(query, {
          $set: {
            last_loggedIn: new Date().toISOString(),
          },
        });
        return res.send(result);
      }

      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    // get a user's role
    app.get("/user/role/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send({ role: result?.role });
    });

    //get user data
    app.get("/user", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // ------------------ UPDATE USER ROLE (ADMIN ONLY) ------------------
    app.patch("/users/role/:id", verifyJWT, async (req, res) => {
      try {
        const adminEmail = req.tokenEmail;
        const targetUserId = req.params.id;
        const { role } = req.body;

        // Allowed roles
        const allowedRoles = ["customer", "librarian", "admin"];
        if (!allowedRoles.includes(role)) {
          return res.status(400).send({ message: "Invalid role" });
        }

        // Check admin
        const adminUser = await usersCollection.findOne({
          email: adminEmail,
        });

        if (!adminUser || adminUser.role !== "admin") {
          return res.status(403).send({ message: "Forbidden access" });
        }

        // Prevent admin changing own role
        const targetUser = await usersCollection.findOne({
          _id: new ObjectId(targetUserId),
        });

        if (!targetUser) {
          return res.status(404).send({ message: "User not found" });
        }

        if (targetUser.email === adminEmail) {
          return res
            .status(400)
            .send({ message: "You cannot change your own role" });
        }

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(targetUserId) },
          { $set: { role } }
        );

        res.send({
          success: true,
          message: `User role updated to ${role}`,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
      }
    });

    //book status update by admin
    app.patch("/books/status/:id", verifyJWT, async (req, res) => {
      try {
        const adminEmail = req.tokenEmail;
        const { status } = req.body;
        const bookId = req.params.id;

        // Admin check
        const adminUser = await usersCollection.findOne({ email: adminEmail });
        if (!adminUser || adminUser.role !== "admin") {
          return res.status(403).send({ message: "Forbidden access" });
        }

        const result = await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $set: { status } }
        );

        res.send({ success: true, message: "Book status updated" });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    //book delete by admin
    app.delete("/books/:id", verifyJWT, async (req, res) => {
      try {
        const adminEmail = req.tokenEmail;
        const bookId = req.params.id;

        // Admin check
        const adminUser = await usersCollection.findOne({ email: adminEmail });
        if (!adminUser || adminUser.role !== "admin") {
          return res.status(403).send({ message: "Forbidden access" });
        }

        // Delete book
        const bookResult = await booksCollection.deleteOne({
          _id: new ObjectId(bookId),
        });

        // Delete all related orders
        await ordersCollection.deleteMany({ bookId });

        res.send({
          success: true,
          message: "Book and related orders deleted",
        });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

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

    // Cancel user order (customer side)
    app.patch("/cancel-order/:id", async (req, res) => {
      try {
        const orderId = req.params.id;

        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { status: "cancelled" } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Order not found" });
        }

        res.send({ message: "Order cancelled successfully" });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    //payment related api
    app.post("/create-checkout-session", async (req, res) => {
      try {
        const paymentInfo = req.body;
        const amount = parseInt(paymentInfo.price) * 100;

        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "bdt",
                unit_amount: amount,
                product_data: {
                  name: paymentInfo.bookName,
                },
              },
              quantity: 1,
            },
          ],

          customer_email: paymentInfo.customer_email,
          mode: "payment",

          metadata: {
            orderId: paymentInfo.orderId,
          },

          // ✅ IMPORTANT CHANGE HERE
          success_url: `${process.env.CLIENT_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_DOMAIN}/dashboard/payment-cancelled`,
        });

        res.send({ url: session.url });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
      }
    });

    app.patch("/payment-success", async (req, res) => {
      try {
        const sessionId = req.query.session_id;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        console.log(session);

        if (session.payment_status === "paid") {
          const id = session.metadata.orderId;
          const query = { _id: new ObjectId(id) };
          const updated = {
            $set: {
              paymentStatus: "paid",
              transactionId: session.payment_intent, // ✅ ADD THIS
              paidAt: new Date(), // ✅ optional but recommended
            },
          };
          const result = await ordersCollection.updateOne(query, updated);

          res.send(result);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: error.message });
      }
    });

    //get invoice
    app.get("/invoices/:email", async (req, res) => {
      try {
        const email = req.params.email;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = {
          customerEmail: email,
          paymentStatus: "paid",
        };

        const invoices = await ordersCollection
          .find(query)
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.send(invoices);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
      }
    });

    //wish list
    app.post("/wishlist", async (req, res) => {
      const wishlist = req.body;

      // prevent duplicate wishlist
      const exists = await wishlistCollection.findOne({
        userEmail: wishlist.userEmail,
        bookId: wishlist.bookId,
      });

      if (exists) {
        return res.status(400).send({ message: "Already wishlisted" });
      }

      const result = await wishlistCollection.insertOne(wishlist);
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
