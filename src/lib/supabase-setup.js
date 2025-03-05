const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = ['http://localhost:3000', 'https://www.parealestatesolutions.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Your other middleware and routes here

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
