const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes'); // අපි හදන රවුට්ස් ටික

const app = express();
app.use(cors());
app.use(express.json());

// රවුට්ස් App එකට සම්බන්ධ කිරීම
app.use('/', chatRoutes);

module.exports = app;