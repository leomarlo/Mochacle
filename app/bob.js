const axios = require('axios')
const fs = require('fs')
const submission_file_string = fs.readFileSync("./app/bob_submission.js")
const myArgs = process.argv.slice(2);
const argument = myArgs[0]
require('dotenv').config({ path: '.env' })

const myName = 'Bob'

async function create_new_Pass(new_token){
    axios
        .post('http://localhost:8080/changePassword', {
            name: myName,
            token: process.env.INIT_TOKEN,
            new_token: new_token
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
}


async function newSubmission(target_id, submission_id, token, packages_required){
  axios
    .post('http://localhost:8080/solutionSubmission', {
      submission_id:submission_id,
      target_id:target_id,
      submitter: myName,
      name: myName,
      token: token,
      submissionjs: submission_file_string.toString(),
      packages_required: packages_required
    })
    .then(res => {
      console.log(`statusCode: ${res.status}`)
      console.log(res.data)
    })
    .catch(error => {
      console.error(error)
    })
}


if (argument=='newToken'){
  if (myArgs[1]){
    create_new_Pass(myArgs[1])
  }
  else {
    console.log('no new token specified!')
  }
}

if (argument=='newSubmission'){
  if (myArgs[1] && myArgs[2]){
    const target_id = parseInt(myArgs[1])
    const submission_id = parseInt(fs.readFileSync("./app/submission_id_current.txt"))
    const token = myArgs[2]
    const packages_required = {"systeminformation": "1.2.3", "matrix-js": "1.5.1", "macaddress": "0.5.1"}
    
    newSubmission(target_id, submission_id, token, packages_required)
    fs.writeFileSync("./app/submission_id_current.txt", submission_id + 1)
  }
  else{
    console.log('Please specify the target_id (aka task_id)')
  }
}