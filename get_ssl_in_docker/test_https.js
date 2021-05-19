// thanks to https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '.ssl.env' })

const app = express();
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());
const domain_name = process.env.DOMAIN_NAME
const privkey_file = process.env.PRIVKEY_FILE
const cert_file = process.env.CERT_FILE
const chain_file = process.env.CHAIN_FILE
// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/' + domain_name + '/' + privkey_file, 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/' + domain_name + '/' + cert_file, 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/' + domain_name + '/' + chain_file, 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.get('/', (req, res) => {
	res.send('Hello there. You made it, Marlowe !');
});

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});