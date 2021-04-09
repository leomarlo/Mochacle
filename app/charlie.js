const axios = require('axios')
const fs = require('fs')
const test_file_string = fs.readFileSync("./app/test_template.js")
const myArgs = process.argv.slice(2);
const argument = myArgs[0]
require('dotenv').config({ path: '.env' })

const myName = 'Charlie'

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


async function testSubmission(target_id, pass_fraction, token){
  axios
    .post('http://localhost:8080/testSubmission', {
      target_id:target_id,
      submitter:myName,
      name: myName,
      token: token,
      pass_fraction: pass_fraction,
      targettemplatejs: test_file_string.toString(),
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

if (argument=='testSubmission'){
  if (myArgs[1] && myArgs[2]){
    const target_id = parseInt(fs.readFileSync("./app/target_id_current.txt"))
    const pass_fraction = parseFloat(myArgs[1])
    const token = myArgs[2]
    testSubmission(target_id, pass_fraction, token)
    fs.writeFileSync("./app/target_id_current.txt", target_id + 1)
  }
  else{
    console.log('Please specify the pass_fraction')
  }
}