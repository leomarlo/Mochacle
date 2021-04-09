const express = require('express');
const cors = require('cors');
const fs = require("fs");

// Constants
const PORT = 1234;
const HOST = '0.0.0.0';

// App
const app = express();

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());

let COUNT = 0

app.post('/dostuff', async function (req, res) {
    // check whether file exists, if yes, then 
    const ret_promise = await fs.promises.appendFile('app/mynewfile1.txt', req.body.text)
    // console.log(ret_promise)
    res.send('return value goes here')
  })

app.get('/', (req, res) => {
    COUNT += 1;
    res.send(`Hello World ${COUNT}`);
});

app.get('/more', async function (req, res) {
    console.log(req.body)
    const ret_promise = await fs.promises.appendFile('app/mynewfile1.txt', req.body.text)
    console.log(ret_promise)
    res.send('Hel');
  });
  


app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);