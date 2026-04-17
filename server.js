const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('Hello from PandaExpress')
})

app.listen(9000, '0.0.0.0', () => {
  console.log('The server is now live and pretty much acessable')
})
