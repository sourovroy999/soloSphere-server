const express=require('express')
const cors=require('cors')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


require('dotenv').config()

const port=process.env.PORT || 9000

const app= express()

const corsOptions={
    origin:['http://localhost:5173',
        'http://localhost:5174'
        
    ],
    Credential:true,
    optionSuccessStatus:200,
}


//middlewire
app.use(cors(
    corsOptions
))
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.iy6spfv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const jobsCollection=client.db('soloSphere').collection('jobs')
    const bidsCollection=client.db('soloSphere').collection('bids')

  
    //get all jobs data from db
    app.get('/jobs',async(req,res)=>{

        const result=await jobsCollection.find().toArray();
        

        res.send(result)
    })

    //get single job data
    app.get('/job/:id', async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result=await jobsCollection.findOne(query)
      res.send(result)
    })


    app.get('/jobs/:email', async(req,res)=>{

    })

    //save bid data in db
    app.post('/bid', async(req,res)=>{
      const bidData=req.body
      
      const result=await bidsCollection.insertOne(bidData)

      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);




app.get('/', (req,res)=>{
    res.send('Hello from solosphere server')
})

app.listen(port, ()=>console.log(`server running on port ${port}`)
)
