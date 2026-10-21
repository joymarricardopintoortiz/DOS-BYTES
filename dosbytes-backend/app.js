const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', require('./src/routes'));

const dist = path.join(__dirname, '..', 'dosbytes-frontend', 'dist');
app.use(express.static(dist));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

module.exports = app;