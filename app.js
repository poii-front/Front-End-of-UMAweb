require('dotenv').config();
require('dotenv').config();
const dns = require('node:dns');
const path = require('node:path');
const dnsServers = process.env.MONGODB_DNS_SERVERS;
if (dnsServers) {
  dns.setServers(dnsServers.split(',').map(server => server.trim()));
}
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/', require('./routes/index'));
app.use('/builds', require('./routes/builds'));
app.use('/supportcards', require('./routes/supportcards'));
app.use('/characters', require('./routes/characters'));

module.exports = app;

if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
      });
    })
    .catch(error => {
      console.error('Could not connect to MongoDB. Check MONGODB_URI:', error.message);
      process.exit(1);
    });
}