const express = require('express')
const app = express()

app.get('/',(req,res)=>{
  res.send('Hello from PandaExpress')
})

app.listen(3000,() =>{
  console.log('The server is now live')
})
