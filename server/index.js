// the backend server that orchestrates everything

// write an app that runs the mocha bash script
const express = require('express');
const runMocha = require('./scripts/mochaTest.js');
const cors = require('cors');
const fs = require("fs");
const crypto = require('crypto');
require('dotenv').config({ path: './server/.server.env' })
//IMPORTANT!! CHANGE THE LOCATION OF THE .server.env path inside the docker environment!!!

// Constants
const PORT = 8080;
const INSIDE_DOCKER = process.env.INSIDE_DOCKER;
let HOST = ''
if (process.env.INSIDE_DOCKER) {
    HOST = '0.0.0.0';
}
else {
    HOST = 'localhost';
}
// App
const app = express();

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());

// RAM Database (must be replaced!!)
const solutionSubmissions = new Object()
const testSubmissions = new Object()
const passwordHashes = new Object() // THis really needs to go into db!!!
const blockedUsers = new Object()

passwordHashes[process.env.ADMIN_NAME] = crypto.createHash(process.env.HASH_FUNCTION).update(process.env.ADMIN_TOKEN).digest('hex')

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/testResult/:submission_id', (req, res) => {
    res.send(solutionSubmissions[req.params.submission_id]);
  });

app.get('/testStatus/:target_id', (req, res) => {
  res.send(testSubmissions[req.params.target_id]);
});

app.post('/adminAddUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    for (let i=0; i<req.body.new_user.length; i++){
      if (req.body.new_user[i] in passwordHashes){
        continue;
      }
      passwordHashes[req.body.new_user[i]] = crypto.createHash(process.env.HASH_FUNCTION).update(process.env.INIT_TOKEN).digest('hex')
    }
    res.send('successfully updated new users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminBlockUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    for (let i=0; i<req.body.block_these_users.length; i++){
      blockedUsers[req.body.block_these_users[i]] = {duration: 'until further notice'}
    }
    res.send('successfully blocked users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminUnblockUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    for (let i=0; i<req.body.unblock_these_users.length; i++){
      delete blockedUsers[req.body.unblock_these_users[i]]
    }
    res.send('successfully blocked users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminGetUsersList', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    const allUsers = Object.keys(passwordHashes)
    const returnUsers = new Array(allUsers.length)
    for(let i=0; i<allUsers.length; i++){
      let password_reset = false
      if (allUsers[i]==process.env.ADMIN_NAME){
        password_reset = passwordHashes[allUsers[i]] != crypto.createHash(process.env.HASH_FUNCTION).update(process.env.ADMIN_TOKEN).digest('hex')
      } else {
        password_reset = passwordHashes[allUsers[i]] != crypto.createHash(process.env.HASH_FUNCTION).update(process.env.INIT_TOKEN).digest('hex')
      }
      returnUsers[i] = {
        name: allUsers[i],
        blocked: allUsers[i] in blockedUsers,
        password_reset: password_reset
      }
    }
    res.send(returnUsers)
  } 
  else{
    res.send('wrong token, sorry')
  }
})


app.post('/changePassword', async (req, res) => {
  if (passwordHashes[req.body.name.toString()] == crypto.createHash(process.env.HASH_FUNCTION).update(req.body.token.toString()).digest('hex')){
    passwordHashes[req.body.name] = crypto.createHash(process.env.HASH_FUNCTION).update(req.body.new_token).digest('hex')
    res.send(`successfully changed password of ${req.body.name}`)
  }
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/testSubmission', async (req, res) => {
  // only users:
  if (!_passTokenTest(req.body.name, req.body.token)){
    res.send('Wrong Password!')
  } else {
    // submit target testfile
    let template_filename = `target_${req.body.target_id}.js`
    // write the file with the testjs parameter
    let path_to_server = './' + (process.env.INSIDE_DOCKER ? '': process.env.SERVER_PATH)
    let path_to_scripts = path_to_server + process.env.SCRIPTS_PATH
    const ret_promise = fs.writeFileSync(path_to_scripts + template_filename, req.body.targettemplatejs)
    testSubmissions[req.body.target_id] = {
      target_id: req.body.target_id,
      name: req.body.submitter,
      targettemplatejs: req.body.targettemplatejs,
      status: 'uploaded',
      pass_fraction: req.body.pass_fraction,
      submissions: new Object(),
      template_filename: template_filename
    }
    res.send(testSubmissions);
  }
})

// submit a solution
app.post('/solutionSubmission', async (req, res) => {
  // only users:
  if (!_passTokenTest(req.body.name, req.body.token)){res.send('Wrong Password!')}
  else {
    // solution file will go into the scripts folder,
    // whose name depends on whether the app runs inside docker or not

    const submission_filename = `target_${req.body.target_id}_id_${req.body.submission_id}_submission.js`
    const test_filename = `target_${req.body.target_id}_id_${req.body.submission_id}_test.js`

    // console.log(testSubmissions[req.body.target_id.toString()])
    const test_template_filename = testSubmissions[req.body.target_id].template_filename
    // write the file with the submissionjs parameter
    const path_to_server = './' + (process.env.INSIDE_DOCKER ? '': process.env.SERVER_PATH)
    const path_to_scripts = path_to_server + process.env.SCRIPTS_PATH
    const ret_promise = fs.writeFileSync(path_to_scripts + submission_filename, req.body.submissionjs)

    
    solutionSubmissions[req.body.submission_id] = {
      id: req.body.submission_id,
      target_id: req.body.target_id,
      name: req.body.submitter,
      testjs: req.body.submissionjs,
      status: 'submitted',
      result: 'no result yet',
      score: 0,
      pass: 0,
      award: 0,
      place: 0,
      submission_filename: submission_filename,
      test_filename: test_filename,
      test_template_filename: test_template_filename,
      required_node_packages: null
    }

    // now also create a test script from the submitted target template
    const read_promise = fs.readFileSync(path_to_scripts + test_template_filename)
    let template = read_promise.toString();
    let test_file_string = template.replace('<<<submission>>>', `./${submission_filename}`)
    const write_promise = fs.writeFileSync(path_to_scripts + test_filename, test_file_string)
    // update testSubmissions
    testSubmissions[req.body.target_id].status = 'has submissions'
    testSubmissions[req.body.target_id].submissions[req.body.submission_id] = {
      submission_id: req.body.submission_id,
      score: solutionSubmissions[req.body.submission_id].score,
      pass: solutionSubmissions[req.body.submission_id].pass,
      award: solutionSubmissions[req.body.submission_id].award,
      place: solutionSubmissions[req.body.submission_id].place
    } // should be joined with solutionSubmission

    res.send(solutionSubmissions);
  }
});

app.post('/runSubmission', async (req, res) => {
  // only users:
  if (!_passTokenTest(req.body.name, req.body.token)){res.send('Wrong Password!')}
  else {
    const test_filename = solutionSubmissions[req.body.submission_id].test_filename
    const path_to_server = './' + (process.env.INSIDE_DOCKER ? '': process.env.SERVER_PATH)
    const path_to_test = path_to_server + process.env.SCRIPTS_PATH
    const result = await runMocha(path_to_test, test_filename)
    solutionSubmissions[req.body.submission_id].status = 'has been run'
    solutionSubmissions[req.body.submission_id].result = result
    const score = summary(result)
    const target_id = solutionSubmissions[req.body.submission_id].target_id
    const pass = (score >= testSubmissions[target_id].pass_fraction ? 1: 0)
    solutionSubmissions[req.body.submission_id].score = score
    solutionSubmissions[req.body.submission_id].pass = pass
    solutionSubmissions[req.body.submission_id].place = getPlace()
    solutionSubmissions[req.body.submission_id].award = getAward()
    // update also testSubmissions
    const testSubmission = testSubmissions[target_id].submissions[req.body.submission_id]
    if (testSubmission) {
      testSubmission.score = solutionSubmissions[req.body.submission_id].score
      testSubmission.pass = solutionSubmissions[req.body.submission_id].pass
      testSubmission.place = solutionSubmissions[req.body.submission_id].place
      testSubmission.award = solutionSubmissions[req.body.submission_id].award
    }
    else {
      console.log("sorry, no submission with this submission id")
    }

    testSubmissions[target_id].status = getStatusForTestSubmission(pass)
    solutionSubmissions[req.body.submission_id].status = getStatusForSolutionSubmission(pass)

    res.send(solutionSubmissions);
  }
});


function _passTokenTest(name,token) {
  const condition_token = passwordHashes[name] == crypto.createHash(process.env.HASH_FUNCTION).update(token).digest('hex')
  const condition_blocked = name in blockedUsers
  return (condition_token && !condition_blocked)
}

function summary(result) {
  return result.stats.passes/result.stats.tests
}


function getAward(){
  return 0
}


function getPlace(){
  return 0
}


function getStatusForTestSubmission(pass) {
  if (pass){
    return 'has been solved'
  } else {
    return 'not yet solved'
  }
}


function getStatusForSolutionSubmission(pass) {
  if (pass){
    return 'successful'
  } else {
    return 'unsuccessful'
  }
}



app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);





