const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// const uri = `mongodb://127.0.0.1/:27017/`
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pr3rbd0.mongodb.net/?retryWrites=true&w=majority`;

const verifyJwt = (req, res, next) => {
  const authorization = req.headers?.authorization;
  if (!authorization) {
    return req.send(401).send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return req
        .send(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next()
  });

};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser:true,
  useUnifiedTopology:true,
  maxPoolSize:10,
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const carServiceCollections = client
      .db("carDoctorService")
      .collection("services");
    const ServiceBookingCollections = client
      .db("carDoctorService")
      .collection("bookings");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token: token });
    });

    app.get("/services", async (req, res) => {
      const query = {};
      const option = {
        projection: { _id: 1, title: 1, img: 1, price: 1 },
      };
      const result = await carServiceCollections.find(query, option).toArray();
      res.send(result);
    });

    //singleId
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carServiceCollections.findOne(query);
      res.send(result);
    });

    //add service
    app.post("/addService", async (req, res) => {
      const newService = req.body;
      const result = await carServiceCollections.insertOne(newService);
      res.send(result);

    });

    // booking methods
    app.post("/bookings", async (req, res) => {
      const newOrder = req.body;
      newOrder.status = "pending";
      const result = await ServiceBookingCollections.insertOne(newOrder);
      res.send(result);
    });

    //bookings get
    app.get("/bookings", verifyJwt, async (req, res) => {
      const decoded = req.decoded?.email;
      if(decoded !== req.query?.email){
    return req.send(401).send({ error: true, message: "unauthorized access" });

      }
      let query = {};

      if(req.query?.email){
        query = {email: req.query?.email}
      }
      const result = await ServiceBookingCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/allOrders", async (req,res) => {
      const query = {};
      const result = await ServiceBookingCollections.find(query).toArray();
      res.send(result)
    })


    // booking delete 
    app.delete("/bookings/:id", async (req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await ServiceBookingCollections.deleteOne(query);
      res.send(result)
    })


    app.patch("/bookings/:id", async (req,res) => {
      const id = req.params.id;
      const orderStatus = req.body.status;
      const filter = {_id: new ObjectId(id)};
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          status: orderStatus
        },
      };
      const result = await ServiceBookingCollections.updateOne(filter, updateStatus, options);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor server running on this server");
});

app.listen(port, () => {
  console.log(`car server running this port ${port}`);
});
