// — — — — 
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



app.get('/', (req, res) => {
    res.send('Your -Construction Tools Manufacturer- Server is Running')
});

app.listen(port, () => {
    console.log('The -Construction Tools Manufacturer- Server Listening to port', port);
})
