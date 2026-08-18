const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());
app.use(express.json({ strict: false }));
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

app.use('/', chatRoutes);

module.exports = app;