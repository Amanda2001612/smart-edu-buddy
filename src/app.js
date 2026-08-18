const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());
// 🔴 JSON සහ Text දෙකම එක වගේ කියවාගැනීමට මේ ක්‍රමය පාවිච්චි කරමු
app.use(express.json());
app.use(express.text()); 
app.use(express.urlencoded({ extended: true }));

// රවුට්ස් App එකට සම්බන්ධ කිරීම
app.use('/', chatRoutes);

module.exports = app;