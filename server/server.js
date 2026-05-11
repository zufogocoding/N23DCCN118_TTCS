const express = require('express');
const cors = require('cors');
const path = require('path');

const streamRoutes = require('./routes/streamRoutes.js')
const songRoutes = require('./routes/songRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const playlistRoutes = require('./routes/playlistRoutes.js');
const interactRoutes = require('./routes/interactRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const app = express()

app.use(cors()); // Cho phép Frontend gọi API 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello from PandaExpress')
})
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(songRoutes);
app.use(streamRoutes);
app.use(authRoutes);
app.use(playlistRoutes);
app.use(interactRoutes);
app.use(dashboardRoutes);

app.listen(9000, '0.0.0.0', () => {
  console.log('The server is now live and pretty much acessable')
})
