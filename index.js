require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware
app.use(cors())
app.use(express.json())







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2trpp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // database collection 
        const userCollection = client.db("learnaMentDB").collection("users");
        const teacherReqCollection = client.db("learnaMentDB").collection("teacherReq");




        // users api 
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existUser = await userCollection.findOne(query);
            if (existUser) {
                return res.send({ message: 'User already exist in db' })
            } else {
                const result = await userCollection.insertOne(user);
                res.send(result)
            }
        })


        // teacher request 
        app.post('/teacherReq', async (req, res) => {
            const teacherReq = req.body;
            const query = { email: teacherReq.email };
            const exist = await teacherReqCollection.findOne(query);
            if (exist) {
                return res.send({ message: "already request" })
            } else {
                const result = await teacherReqCollection.insertOne(teacherReq)
                res.send(result)
            }
        })

        app.get('/teacherReq/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await teacherReqCollection.findOne(query);
            res.send(result)
        })

        app.patch('/teacherReqAgain/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "pending"
                },
            };
            const result = await teacherReqCollection.updateOne(filter, updateDoc)
            res.send(result)
        })










        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Learnament data is running')
})

app.listen(port, () => {
    console.log(`Learnament is running on port  ${port}`);
})


