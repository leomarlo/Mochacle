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


// chain_name: req.body.chain_name,
// chain_id: req.body.chain_id,
// transaction_hash: req.body.transaction_hash,
// transaction_url: req.body.transaction_url,

async function submitTest(name, token, script_string, test_id, chain_name, chain_id, pass_fraction, packages_required, transaction_hash, transaction_url){
  try{
    const res = await instance.post(HOSTPORT + '/testSubmission', {
        target_id:test_id,
        submitter:name,
        name: name,
        token: token,
        chain_name: chain_name,
        chain_id: chain_id,
        pass_fraction: pass_fraction,
        targettemplatejs: script_string,
        packages_required: packages_required,
        transaction_hash: transaction_hash,
        transaction_url: transaction_url
      })
    console.log('we are in submission mode')
    console.log(res.data)
    return res.data
  } catch (e) {
      return e.toJSON().message
  }
}


async function submitSolution(name, token, script_string, test_id, solution_id, chain_name, chain_id, packages_required, transaction_hash, transaction_url){
  
  try {
    const res = await instance.post(HOSTPORT + '/solutionSubmission', {
      submission_id:solution_id,
      target_id:test_id,
      submitter: name,
      name: name,
      token: token,
      chain_name: chain_name,
      chain_id: chain_id,
      submissionjs: script_string,
      packages_required: packages_required,
      transaction_hash: transaction_hash,
      transaction_url: transaction_url
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