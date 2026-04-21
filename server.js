const express = require('express');

const path = require('path');

const songRoutes = require('./routes/songRoutes.js')
const streamRoutes = require('./routes/streamRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello from PandaExpress')
})
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(songRoutes);
app.use(streamRoutes);

app.listen(9000, '0.0.0.0', () => {
  console.log('The server is now live and pretty much acessable')
})
