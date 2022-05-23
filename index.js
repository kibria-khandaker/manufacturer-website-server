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

        // input use data in MDB 
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

        //  GET booking product from MDB
        // http://localhost:5000/booking?patient=kibriakhandaker66@gmail.com
        app.get('/booking', async (req, res) => {
            const bookUserEmail = req.query.bookUserEmail;
            
            const authorization = req.headers.authorization;
            console.log('Auth Header', authorization);

            const query = { bookUserEmail: bookUserEmail }
            const userBookings = await bookingCollection.find(query).toArray()
            res.send(userBookings)
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
