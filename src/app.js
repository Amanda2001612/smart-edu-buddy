const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());
// JSON වෙනුවට Text ලෙස දත්ත ලබා ගැනීම (Unexpected end of JSON input වැළැක්වීමට)
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));

app.use('/', chatRoutes);

module.exports = app;