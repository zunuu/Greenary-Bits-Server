const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uvk0h.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log('db connected');
        const toolsCollection = client.db('greenary_bits_db').collection('tools');
        const orderCollection = client.db('greenary_bits_db').collection('order');
        const usersCollection = client.db('greenary_bits_db').collection('users');

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
        app.get('/tools/:_id', async (req, res) => {

            const _id = req.params._id;
            const query = { _id: ObjectId(_id) };
            const tools = await toolsCollection.findOne(query);
            res.send(tools);

        })
        app.get('/order', async (req, res) => {

            const userEmail = req.query.userEmail;

            const query = { userEmail: userEmail };
            const cursor = orderCollection.find(query);
            const order = await cursor.toArray();
            res.send(order);


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