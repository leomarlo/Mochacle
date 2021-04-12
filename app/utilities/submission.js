const axios = require('axios')
const fs = require('fs')
const myArgs = process.argv.slice(2);
const argument = myArgs[0]
require('dotenv').config({ path: '.env' })
let HOSTPORT = (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER : process.env.SERVERHOST_LOCAL)


async function submitTest(name, token, script_string, test_id, pass_fraction, packages_required){
    console.log("test_id", test_id, " inside submitTest function")
    axios
      .post(HOSTPORT + '/testSubmission', {
        target_id:test_id,
        submitter:name,
        name: name,
        token: token,
        pass_fraction: pass_fraction,
        targettemplatejs: script_string,
        packages_required: packages_required
      })
      .then(res => {
        console.log(`statusCode: ${res.status}`)
        // console.log(res.data)
      })
      .catch(error => {
        console.error(error)
      })
  }


async function submitSolution(name, token, script_string, test_id, solution_id, packages_required){
axios
    .post(HOSTPORT + '/solutionSubmission', {
    submission_id:solution_id,
    target_id:test_id,
    submitter: name,
    name: name,
    token: token,
    submissionjs: script_string,
    packages_required: packages_required
    })
    .then(res => {
    console.log(`statusCode: ${res.status}`)
    // console.log(res.data)
    })
    .catch(error => {
    console.error(error)
    })
}


async function runSubmission(name, token, solution_id){
    console.log("inside run Submission")
    axios
      .post(HOSTPORT + '/runSubmission', {
          submission_id: solution_id,
          name: name,
          token: token,
      })
      .then(res => {
        console.log(`statusCode: ${res.status}`)
        // console.log(res.data)
        // console.log("no res data?")
      })
      .catch(error => {
        console.error(error)
      })
  }
  

  module.exports = {
    submitTest,
    submitSolution,
    runSubmission
};