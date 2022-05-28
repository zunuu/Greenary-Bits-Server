const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uvk0h.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}
async function run() {
    try {
        await client.connect();
        console.log('db connected');
        const toolsCollection = client.db('greenary_bits_db').collection('tools');
        const orderCollection = client.db('greenary_bits_db').collection('order');
        const usersCollection = client.db('greenary_bits_db').collection('users');
        const reviewsCollection = client.db('greenary_bits_db').collection('reviews');

        app.post('/tools', async (req, res) => {
            const newtool = req.body;
            const result = await toolsCollection.insertOne(newtool)
            res.send(result);
        })
        app.post('/reviews', async (req, res) => {
            const reviews = req.body;
            const result = await reviewsCollection.insertOne(reviews)
            res.send(result);
        })


        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        })



        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };

                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);

                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }

        })

        // app.post('/create-payment-intent', verifyJWT, async (req, res) => {
        //     const service = req.body;
        //     const price = service.price;
        //     const amount = price * 100;
        //     const paymentIntent = await stripe.paymentIntent.create({
        //         amount: amount,
        //         currency: 'usd',
        //         payment_method_types: ['card']
        //     });
        //     res.send({ clientSecret: paymentIntent.client_secret })
        // })




        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })


        app.get('/tools', async (req, res) => {

            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);

        })

        app.get('/reviews', async (req, res) => {

            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);

        })
        app.get('/tools/:_id', async (req, res) => {

            const _id = req.params._id;
            const query = { _id: ObjectId(_id) };
            const tools = await toolsCollection.findOne(query);
            res.send(tools);

        })
        app.get('/order', verifyJWT, async (req, res) => {

            const userEmail = req.query.userEmail;
            // const authorization = req.headers.authorization;
            // console.log(authorization);
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const cursor = orderCollection.find(query);
                const order = await cursor.toArray();
                return res.send(order);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }


        })


        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await orderCollection.findOne(query);
            res.send(purchase);
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })
    }

    finally {

    }
}



run().catch(console.dir)

console.log(uri);

app.get('/', (req, res) => {
    res.send('server started');
});


app.listen(port, () => {
    console.log('listening to port', port);
})