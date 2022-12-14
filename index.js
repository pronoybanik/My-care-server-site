const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.POST || 5000;
const stripe = require("stripe")(process.env.STRIP_COAD)

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ru2hz6y.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    // console.log('access you', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const carProductsCollection = client.db('carSite').collection('carCollection');
        const carBookingCollection = client.db('carSite').collection('booking');
        const userCollection = client.db('carSite').collection('users');
        const spareCollection = client.db('carSite').collection('spare');
        const productsCollection = client.db('carSite').collection('products');
        const updateCarCollection = client.db('carSite').collection('updatecar');
        const paymentCollection = client.db('carSite').collection('payments')
        const feedBackCollection = client.db('carSite').collection('feedback')


        app.get('/services', async (req, res) => {
            const query = {};
            const result = await carProductsCollection.find(query).toArray()
            res.send(result)
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await carProductsCollection.findOne(query)
            res.send(service)
        });

        app.post('/bookings', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await carBookingCollection.insertOne(user)
            res.send(result)
        });

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const bookings = await carBookingCollection.deleteOne(query)
            res.send(bookings)
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const bookings = await carBookingCollection.findOne(query)
            res.send(bookings)
        });

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodeEmail = req.decoded.email;

            if (email !== decodeEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const booking = await carBookingCollection.find(query).toArray();
            res.send(booking);
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20h' })
                return res.send({ accessToken: token })
            }
            console.log(user);
            res.status(403).send({ accessToken: '' })
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userCollection.insertOne(user)
            res.send(result)
        });

        // create admin 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });

        });

        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });

        // create sellers section
        app.get('/users/sellers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ isSeller: user?.roles === 'seller' });

        });

        app.put('/users/sellers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    roles: 'seller'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });

        app.get('/users', verifyJWT, async (req, res) => {
            const query = {};
            const result = await userCollection.find(query).toArray()
            res.send(result);
        });

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const output = await userCollection.deleteOne(filter);
            res.send(output);
        });


        app.get('/spare', async (req, res) => {
            const query = {}
            const result = await spareCollection.find(query).toArray();
            res.send(result)
        });

        // add products api

        app.post('/products', async (req, res) => {
            const user = req.body;
            const result = await productsCollection.insertOne(user)
            res.send(result)
        });

        app.get('/products', async (req, res) => {
            const query = {}
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        });

        app.get('/updatecar', async (req, res) => {
            const query = {}
            const cars = await updateCarCollection.find(query).toArray()
            res.send(cars)
        });

        app.get('/update/:id', async (req, res) => {
            const id = req.params.id;
            const user = { _id: ObjectId(id) }
            const result = await updateCarCollection.findOne(user)
            res.send(result)
        });

        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const price = booking.sellprice;
            const amount = parseInt(price) * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await carBookingCollection.updateOne(filter, updateDoc)
            console.log('updateResult', updateResult);
            res.send(updateResult)
        })

        // feedback api

        app.post('/feedback', async (req, res) => {
            const query = req.body
            const feedback = await feedBackCollection.insertOne(query)
            res.send(feedback);
        });

        app.get('/feedback', async (req, res) => {
            const query = {}
            const result = await feedBackCollection.find(query).toArray()
            res.send(result)
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