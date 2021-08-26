// Dependencies
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '.dapp.env' })
// Configure & Run the http server
const app = express();

app.use(express.static('.', { dotfiles: 'allow' } ));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());


const acme_challenge = new Object()

app.get('/', (req, res) => {
   res.send('Welcome to the auxillary Nodejs server, which is used to obtain a sll certificate from lets encrypt. To this end we need to get the acme challenge right. Please add a-string and a-challenge to this url route testoracle.xyz/add_acme/:astring/:achallenge');
  });

app.get('/add_acme/:astring/:achallenge', (req, res) => {
    acme_challenge[req.params.astring] = req.params.achallenge
    res.send(acme_challenge);
  });

app.get('/.well-known/acme-challenge/:astring', (req, res) => {
    res.send(acme_challenge[req.params.astring]);
  });


app.listen(80, () => {
  console.log('HTTP server running on port 80');
});