// — — — — 
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

//-------------------------------------------------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lytri.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthHeader access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        // console.log(decoded)
        req.decoded = decoded;
        next()
    });
}

async function run() {
    try {
        //--------
        await client.connect();
        const toolsCollection = client.db("toolsData").collection("tools");
        const bookingCollection = client.db("toolsData").collection("bookings");
        const userCollection = client.db("toolsData").collection("users");

        // Get Data From MDB
        app.get('/tools', async (req, res) => {
            const myTools = await toolsCollection.find({}).toArray();
            res.send(myTools)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {

            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                res.status(403).send({ message: 'Forbidden to access' })
            }

        })

        // Get use's Information from in MDB
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        // input use's Information data in MDB 
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            // res.send(result);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            res.send({ result, token });
        })

        // Get Single single Data
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const toolsID = await toolsCollection.findOne(query);
            res.send(toolsID)
        })

        // Post tools in Database MDB ,
        app.post('/tools', async (req, res) => {
            const task = req.body;
            const result = await toolsCollection.insertOne(task)
            res.send(result);
        })

        //  GET booking product from MDB
        app.get('/booking', verifyJWT, async (req, res) => {
            const bookUserEmail = req.query.bookUserEmail;
            const decodedEmail = req.decoded.email;
            if (bookUserEmail === decodedEmail) {
                const query = { bookUserEmail: bookUserEmail }
                const bookings = await bookingCollection.find(query).toArray()
                res.send(bookings)
            } else {
                return res.status(403).send({ message: 'Forbidden access the link' })
            }
        })

        // booking post or sent data to MDB 
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                bookToolsId: booking.bookToolsId,
                bookUserEmail: booking.bookUserEmail
            };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const myBooking = await bookingCollection.insertOne(booking);
            return res.send({ success: true, myBooking });
        })

        //--------
    } finally { }
}
run().catch(console.dir)
//-------------------------------------------------------------

app.get('/', (req, res) => {
    res.send('Your -Construction Tools Manufacturer- Server is Running')
});

app.listen(port, () => {
    console.log('The -Construction Tools Manufacturer- Server Listening to port', port);
})
