require('dotenv').config()
const express = require('express');
const app = express()
const jwt = require('jsonwebtoken');
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
        const classCollection = client.db("learnaMentDB").collection("classes");

        // jwt related apis
        // create jwt token 
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = await jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token });
        })

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' })
                }
                req.decoded = decoded
                next()
            });
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "forbidden Access" })
            }
            next()
        }



        // users api 
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const search = req.query.search || '';
            const query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })

        // get admin 
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                res.status(403).send('Forbidden access')
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        // get teacher 

        app.get('/user/teacher/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const teacher = user?.isTeacher || false;
            res.send({ teacher });
        });







        app.get('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query)
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


        // set user as a teacher 
        app.patch('/user/setTeacher/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    isTeacher: true
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })


        // make a user admin 
        app.patch('/user/makeAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })



        // teacher request  apis

        // get teachers requests
        app.get('/teachersRequests', verifyToken, verifyAdmin, async (req, res) => {
            const search = req.query.search || "";
            const query = search
                ? { name: { $regex: search, $options: 'i' } }
                : {};

            const result = await teacherReqCollection.find(query).toArray();
            res.send(result);
        })

        // post teacher request 

        app.post('/teacherReq', verifyToken, async (req, res) => {
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

        app.get('/teacherReq/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await teacherReqCollection.findOne(query);
            res.send(result)
        })

        app.patch('/teacherReqAgain/:id', verifyToken, async (req, res) => {
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

        // approve teacher request
        app.patch('/teacher/approve/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "approved"
                },
            };
            const result = await teacherReqCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // reject teacher request
        app.patch('/teacher/reject/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "rejected"
                },
            };
            const result = await teacherReqCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // class related apis
        app.post('/addClass', verifyToken, async (req, res) => {
            const classInfo = req.body;
            const result = await classCollection.insertOne(classInfo)
            res.send(result)
        })

        // get all classes | only admin
        app.get('/classes/admin', verifyToken, verifyAdmin, async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })

        // class approved by admin 
        app.patch('/classes/approveAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "approved"
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // class rejected by admin 
        app.patch('/classes/rejectAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: "rejected"
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        // teacher get his classes
        app.get('/classes/teacher/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = {email: email};
            const result = await classCollection.find(filter).toArray();
            res.send(result)
        })

        // delete class 
        app.delete('/class/delete/:id', verifyToken, async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await classCollection.deleteOne(query);
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


