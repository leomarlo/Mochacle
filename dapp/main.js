const express = require('express');
const http = require('http');
var https = require('https')
const cors = require('cors');
const fs = require("fs");
require('dotenv').config({ path: './.dapp.env' })
//IMPORTANT!! CHANGE THE LOCATION OF THE .dapp.env path inside the docker environment!!!

// Constants
let HOST = ''
if (process.env.INSIDE_DOCKER) {
    HOST = '0.0.0.0';
}
else {
    HOST = 'localhost';
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());
app.use(express.static(__dirname));

const domain_name = process.env.DOMAIN_NAME
const privkey_file = process.env.PRIVKEY_FILE
const cert_file = process.env.CERT_FILE
const chain_file = process.env.CHAIN_FILE

let httpServer = new Object()
let httpsServer = new Object()

if (process.env.REMOTE_OR_LOCAL=='remote'){

  // Certificate
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/' + domain_name + '/' + privkey_file, 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/' + domain_name + '/' + cert_file, 'utf8');
  const ca = fs.readFileSync('/etc/letsencrypt/live/' + domain_name + '/' + chain_file, 'utf8');
  // credentials
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };

  // Starting https server
  httpsServer = https.createServer(credentials, app);
}

httpServer = http.createServer(app);

httpServer.listen(process.env.INTERNAL_PORT, () => {
	console.log(`HTTP Server running on port ${process.env.EXTERNAL_PORT}`);
});


if (process.env.REMOTE_OR_LOCAL=='remote'){
  httpsServer.listen(process.env.INTERNAL_PORT_HTTPS, () => {
    console.log(`HTTPS Server running on port ${process.env.INTERNAL_PORT_HTTPS}`);
  });
}