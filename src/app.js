const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());

// Parse JSON body and capture raw string in case of fallback
app.use(express.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf ? buf.toString(encoding || 'utf8') : '';
    }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' }));

// Robust error handling middleware for body parsing errors (e.g., empty JSON, malformed JSON)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError || err.status === 400 || 'body' in err) {
        req.body = req.rawBody || req.body || {};
        return next();
    }
    next(err);
});

app.use('/', chatRoutes);

module.exports = app;