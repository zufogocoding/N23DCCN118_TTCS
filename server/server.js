const express = require('express');
const cors = require('cors');
const path = require('path');

const streamRoutes = require('./routes/streamRoutes.js')
const songRoutes = require('./routes/songRoutes.js')
const authRoutes = require('./routes/authRoutes.js')
const playlistRoutes = require('./routes/playlistRoutes.js');
const interactRoutes = require('./routes/interactRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
 
const uploadRoutes = require('./routes/uploadRoutes');
const adminSongRoutes = require("./routes/adminSongRoutes");

const userRoutes = require('./routes/userRoutes.js');
const artistRequestRoutes = require('./routes/artistRequestRoutes.js');
 
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
 
app.use(uploadRoutes);
app.use(adminSongRoutes);

app.use('/api/users', userRoutes);
app.use('/api/artist-requests', artistRequestRoutes);


app.listen(9000, '0.0.0.0', () => {
  console.log('The server is now live and pretty much acessable')
})
