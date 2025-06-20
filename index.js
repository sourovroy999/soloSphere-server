const express=require('express')
const cors=require('cors')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt=require('jsonwebtoken')
const cookieParser= require('cookie-parser')


require('dotenv').config()

const port=process.env.PORT || 9000

const app= express()

const corsOptions={
    origin:['http://localhost:5173',
        'http://localhost:5174',
      'https://solosphereauth.web.app'
        
    ],
    credentials:true,
    optionSuccessStatus:200,
}


//middlewire
app.use(cors(
    corsOptions
))
app.use(express.json())
app.use(cookieParser()); 

//verify jwt middleware
const verifyToken=(req,res,next)=>{
  console.log('i am a middle man');
  const token=req.cookies?.token
  if(!token) return res.status(401).send({message: 'Unauthorizes Access'})
      console.log(token);
      //decode token
      if(token){
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
          if(err){
            console.log(err);
            
          return res.status(401).send({message: 'Unauthorizes Access'})
            
          }
          console.log(decoded);
          req.user= decoded
          next()

        })
      }
}


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

    //jwt generate
    app.post('/jwt', async(req,res)=>{
      const email=req.body
      const token= jwt.sign(email, process.env.ACCESS_TOKEN_SECRET , {
        expiresIn: '7d'
      })
      // const token='helootokennnn'
      res.cookie('token', token, {
        httpOnly:true,
      
        secure:process.env.NODE_ENV ==='production',
        sameSite: process.env.NODE_ENV === 'production'? 'none': 'strict'


      }).send({success: true})

    })

    //clear token on logout
    app.get('/logout', (req,res)=>{
      res
      .clearCookie('token',{
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite:process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge:0,

      })
      .send({success: true})
    })





  
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


   

    //save job data in db
    app.post('/job', async(req,res)=>{
      const jobData=req.body
      
      const result=await jobsCollection.insertOne(jobData)

      res.send(result)
    })

   

    //get all jobs posted by user

    app.get('/jobs/:email', verifyToken, async(req,res)=>{
    const tokenEmail=req.user.email
      console.log(tokenEmail, 'from inside token ');
      
      const email=req.params.email

      if(tokenEmail !== email){
         return res.status(403).send({message: 'Forbidden Access'})
      }
      
      const query={'buyer.buyer_email':email }
      const result=await jobsCollection.find(query).toArray()
      res.send(result)
    })

   

    app.delete('/job/:id',async(req,res)=>{
      const id=req.params.id
      const query={_id : new ObjectId(id)}
      const result=await jobsCollection.deleteOne(query)

      res.send(result)
    })

    //update a job
    app.put('/job/:id', async(req,res)=>{
      const id=req.params.id
      const jobData=req.body
      const query={_id : new ObjectId(id)}
      const options={upsert: true}
      const updateDoc={
        $set:{
          ...jobData, 
        }
      }
      const result=await jobsCollection.updateOne(query, updateDoc,options)
      res.send(result)
    })

    //save a bid data in db
     app.post('/bid',async(req,res)=>{

      const bidData=req.body
      
      //check if its a duplicate request

      const query={
        email: bidData.email,
        jobId: bidData.jobId,
      }


      const alreadyApplied=await bidsCollection.findOne(query)
      console.log(alreadyApplied);
      if(alreadyApplied){

        return res
        .status(400)
        .send('you have already places a bid on the job')
      }
      
      const result=await bidsCollection.insertOne(bidData)
       res.send(result)
    })

    //get all bids for a user by email from db
     app.get('/my-bids/:email', verifyToken, async(req,res)=>{
      const email=req.params.email
      // const query={email: email}
      const query={email} //dui bar same jinis likha ar ekbar likha same
      const result=await bidsCollection.find(query).toArray()

      res.send(result)
     })

     //get all bid requestes from db for job owner

     app.get('/bid-requests/:email', verifyToken, async(req,res)=>{
      const email=req.params.email
      const query={'buyer.buyer_email': email}
      const result=await bidsCollection.find(query).toArray()

      res.send(result)

     })

    // update bid status
    app.patch('/bid/:id', async(req,res)=>{
      const id= req.params.id
      const status=req.body
      const query={_id: new ObjectId(id)}
      const updateDoc={
        $set: status
      }

      const result=await bidsCollection.updateOne(query, updateDoc)
      res.send(result)
    })

     //get all jobs data from db for pagination
    app.get('/all-jobs',async(req,res)=>{

      const size=parseInt(req.query.size)
      const page=parseInt(req.query.page) -1 
      const filter=req.query.filter
      console.log(size,page);
      const sort=req.query.sort
      const search=req.query.search



      let query={
      job_title:{$regex:search, $options:'i'}
      }
      if(filter) query.category=filter

      let options={}
      if(sort) options={sort : {deadline: sort === 'asc' ? 1 : -1}}
      
        const result=await jobsCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray(); 
        

        res.send(result)
    })

     //get all jobs data count
    app.get('/jobs-count',async(req,res)=>{
        const filter=req.query.filter
        const search=req.query.search

         let query={
      job_title:{$regex:search, $options:'i'}
      }
      if(filter) query.category=filter
      

        const count=await jobsCollection.countDocuments(query)
        

        res.send({count})
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
