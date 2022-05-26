// — — — — 
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// payment related ----+++
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const profileCollection = client.db("toolsData").collection("userProfiles");
        const reviewCollection = client.db("toolsData").collection("reviews");
        const paymentCollection = client.db("toolsData").collection("payments");

        // For Admin verify like JTW
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'Forbidden to access' })
            }
        }

        // payment stripe function --------------+++++
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const product = req.body;
            const price = product.bookPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret, });
        });
        // payment stripe function ++++++++++++++++

        // Get Data From MDB ---+++ if i add verifyJWT, verifyAdmin, home page not loading.
        app.get('/tools', async (req, res) => {
            const myTools = await toolsCollection.find({}).toArray();
            res.send(myTools)
        })

        // Get Data From MDB ---+++++++++++++++++++
        app.get('/tools/manage', verifyJWT, verifyAdmin, async (req, res) => {
            const myTools = await toolsCollection.find({}).toArray();
            res.send(myTools)
        })

        // Delete tools/product Data From MDB ---+++++++++++++++++++
        app.delete('/tools/manage/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(query);
            res.send(result);
        })

        // Get Single Profile Info ----------------------
        app.get('/portfolio/:email', async (req, res) => {
            const email = req.params.email;
            if (email) {
                const myProfile = await profileCollection.findOne({ email: email });
                return res.send({ success: true, myProfile })
            } else {
                return res.send({ success: false, myProfile });
            }
        })

        // Get Data From MDB
        app.get('/profile', async (req, res) => {
            const profile = await profileCollection.find({}).toArray();
            res.send(profile)
        })

        // Add/send Profile info in MDB-----------
        app.post('/profile', async (req, res) => {
            const profile = req.body;
            const query = {
                email: profile.email
            };
            const exists = await profileCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, profile: exists })
            }
            const myProfile = await profileCollection.insertOne(profile);
            return res.send({ success: true, myProfile });
        })

        // Get data is admin role --- check from MDB
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // A old Admin Make/set a admin-role to new user And --- the info send in MDB
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Get use's Information from in MDB
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        // send use's Information data in MDB 
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

        // Post tools in Database MDB , -- verifyJWT added --------------
        app.post('/tools', verifyJWT, verifyAdmin, async (req, res) => {
            const task = req.body;
            const result = await toolsCollection.insertOne(task)
            res.send(result);
        })

        // manage Booking -----------++++
        // Get Data From MDB ---+++++++++++++++++++
        app.get('/booking/manage', verifyJWT, verifyAdmin, async (req, res) => {
            const manageBooking = await bookingCollection.find({}).toArray();
            res.send(manageBooking)
        })

        // for payment er kajer jonno ++++++++++
        app.get('/booking/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const manageBooking = await bookingCollection.findOne(query);
            res.send(manageBooking)
        })

        // payment stripe transactionId send in MDB function ++++++++----------------
        app.patch('/booking/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                },
            };
            const result = await paymentCollection.insertOne(payment);
            const paymentBooking = await bookingCollection.updateOne(filter, updateDoc);
            res.send(updateDoc)
        })

        // Delete tools/product Data From MDB ---+++++++++++++++++++
        app.delete('/booking/manage/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const manageBooking = await bookingCollection.deleteOne(query);
            res.send(manageBooking);
        })
        // manage Booking ++++---------

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
                bookUserEmail: booking.bookUserEmail,
            };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const myBooking = await bookingCollection.insertOne(booking);
            return res.send({ success: true, myBooking });
        })

        // Normal user Deletenpm run start-dev personal order ------+++++++++++
        app.delete('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })
        //--------

        // Review API ---
        app.get('/review', async (req, res) => {
            const review = await reviewCollection.find().toArray();
            res.send(review)
        })

        app.post('/review', async (req, res) => {

            const review = req.body;
            const query = {
                email: review.email
            };
            const exists = await reviewCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, review: exists })
            }
            const myReview = await reviewCollection.insertOne(review)
            return res.send({ success: true, myReview });
        })

        //--------
    } finally { }
}
run().catch(console.dir)
//-------------------------------------------------------------

app.get('/', (req, res) => {
    res.send('Your -Construction Tools Manufacturer- Server is Running And with all Completed')
});

app.listen(port, () => {
    console.log('The -Construction Tools Manufacturer- Server Listening to port', port);
})

//------