const axios = require('axios')
const https = require('https')
const fs = require('fs')
const myArgs = process.argv.slice(2);
const argument = myArgs[0]
require('dotenv').config({ path: '.env' })
const instance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});
let HOSTPORT = ''
if (process.env.REMOTE==1) {
  HOSTPORT = process.env.SERVERHOST_DOCKER_REMOTE
} else {
  HOSTPORT = (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
}

async function submitTest(name, token, script_string, test_id, pass_fraction, packages_required, verbose){
  try{
    const res = await instance.post(HOSTPORT + '/testSubmission', {
        target_id:test_id,
        submitter:name,
        name: name,
        token: token,
        pass_fraction: pass_fraction,
        targettemplatejs: script_string,
        packages_required: packages_required
      })
    console.log('we are in submission mode')
    console.log(res.data)
    return res.data
  } catch (e) {
      return e.toJSON().message
  }
}


async function submitSolution(name, token, script_string, test_id, solution_id, packages_required, verbose){
  
  try {
    const res = await instance.post(HOSTPORT + '/solutionSubmission', {
      submission_id:solution_id,
      target_id:test_id,
      submitter: name,
      name: name,
      token: token,
      submissionjs: script_string,
      packages_required: packages_required
    })
    return res.data
  } catch (e) {
    return e.toJSON().message
  }
}


async function runSubmission(name, token, solution_id, verbose){
  
  try {
    const res = await instance.post(HOSTPORT + '/runSubmission', {
          submission_id: solution_id,
          name: name,
          token: token,
      })
    return res.data
  } catch(e) {
    return e.toJSON().message
  }
}
  

module.exports = {
    submitTest,
    submitSolution,
    runSubmission
};