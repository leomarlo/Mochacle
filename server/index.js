// the backend server that orchestrates everything

// write an app that runs the mocha bash script
const express = require('express');
const runMocha = require('./scripts/mochaTest.js');

// Constants
const PORT = 8080;
const INSIDE_DOCKER = true;
let HOST = ''
if (INSIDE_DOCKER) {
    HOST = '0.0.0.0';
}
else {
    HOST = 'localhost';
}
// App
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/test', async (req, res) => {
    const result = await runMocha(INSIDE_DOCKER)
    res.send(result);
  });

// runMocha()


app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);





