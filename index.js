const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.POST || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ru2hz6y.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const carProductsCollection = client.db('carSite').collection('carCollection')
        const carBookingCollection = client.db('carSite').collection('booking')



        app.get('/services', async (req, res) => {
            const query = {};
            const result = await carProductsCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await carProductsCollection.findOne(query)
            res.send(service)
        })

        app.post('/bookings', async (req, res) => {
            const user = req.body;
            const result = await carBookingCollection.insertOne(user)
            res.send(result)
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const booking = await carBookingCollection.find(query).toArray();
            res.send(booking);
        })
    }
    finally {

    }
}
run().catch(err => console.log(err))


app.get('/', (req, res) => {
    res.send('cars server site is running')
});

app.listen(port, () => console.log(`cars running ${port}`))