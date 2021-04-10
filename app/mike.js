const axios = require('axios')
const fs = require('fs')
const test_file_string = fs.readFileSync("./app/test_template.js")
const myArgs = process.argv.slice(2);
const argument = myArgs[0]
require('dotenv').config({ path: '.env' })
let HOSTPORT = (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER : process.env.SERVERHOST_LOCAL)

const myName = 'Mike'

async function create_new_Pass(new_token){
    axios
        .post(HOSTPORT + '/changePassword', {
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


async function runSubmission(submission_id, token){
  axios
    .post(HOSTPORT + '/runSubmission', {
        submission_id: submission_id,
        name: myName,
        token: token,
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

if (argument=='runSubmission'){
  if (myArgs[1] && myArgs[2]){
    const submission_id = parseInt(myArgs[1])
    const token = myArgs[2]
    runSubmission(submission_id,token)
  }
  else{
    console.log('Please specify the pass_fraction')
  }
}