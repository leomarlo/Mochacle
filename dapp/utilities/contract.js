import dotenv from 'dotenv'
import {ethers} from 'ethers'
import {PROVIDER, ABIS, CONTRACT_ADDRESS} from './web3'
import {testFile, solutionFile} from './files'
import {mochaTestDisplayHandler, solutionDisplayHandler} from './display.js'
import axios from 'axios'

import crypto from 'crypto'
dotenv.config()

const mocha_test_file_display = document.getElementById("mocha-filename-info")
const mocha_solution_file_display = document.getElementById("solution-filename-info")

const pass_fraction = document.getElementById("pass-fraction-input")
const eth_reward = document.getElementById("reward-input")
const mocha_target_input = document.getElementById("test-script-id-input")
const upload_mocha_test_btn = document.getElementById("submit-test-btn")
const upload_mocha_solution_btn = document.getElementById("submit-solution-btn")
const solution_reward_input = document.getElementById("solution-id-input")

async function rewardSolutionHandler(provider, solution_id, mochacleAddress, mochacleABI) {
  // let solution_id = solution_reward_input.value
  if (!solution_id) {
    console.log("solution_id is not specified!")
    return null
  }
  console.log('solution_id', solution_id)

  // submit requestScore to the contract
  // let provider = WEB3.PROVIDER
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  // create contract from provider

  const Mochacle = new ethers.Contract(
    mochacleAddress,
    mochacleABI,
    signer);
    
  let return_status = ''
  let transaction_hash = ''
  let transaction_url = ''

  try {

    const request_tx = await Mochacle.requestScore('0x' + solution_id);
    const request_receipt = await request_tx.wait()

    return_status += "Successfully requested the Score!"
    transaction_hash = request_receipt.transactionHash
    transaction_url = 'https://' + provider._network.name + '.etherscan.io/tx/' + request_receipt.transactionHash
    
    let submission_url = process.env.SERVERHOST_DOCKER_REMOTE 
    submission_url += "/submission_ids/" + solution_id
    console.log(submission_url)
    try {
      const res_submission = await axios.get(submission_url);
      console.log(res_submission)
      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/addTransactionInfos', {
        name: address,
        token: address.slice(-10,),
        id: res_submission.data.target_id,
        transaction_type: 'reward',
        transaction_hash: transaction_hash,
        transaction_url: transaction_url
      });
      console.log(res.data)
      return_status += "\nSuccessfully added the transaction url to the solution."
    } catch (err) {
      console.log(err)
      return_status += err.toString()
    }

  } catch (err) {
    console.log(err)
    return_status += err.toString()
  }

  console.log(return_status)

}


function cidAndUidFromScriptAndAddress(script, address, chainid){
  let cid = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(script)
      .digest('hex')
  const uid_20byte = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(cid + address + chainid)
      .digest('hex')
  // cast into 16-byte unique identifyer
  const uid = uid_20byte.slice(0,32)
  return {cid, uid} 
}

async function uploadMochaTestToBlockchainAndServer(mocha_script_string, fraction, value){

    // get content identifyer and unique id for this mocha test submission
    // console.ĺog('TestOracle_ABI')
    // web3Modal.clearCachedProvider();
    // const provider = await connect();
    let provider = PROVIDER.INDUCED
    const signer = provider.getSigner(0);
    const address = await signer.getAddress();
    const {cid, uid} = cidAndUidFromScriptAndAddress(mocha_script_string, address, provider._network.chainId)
    console.log('provider', provider)
    console.log('provider._network', provider._network)
    console.log('signer', signer)
    // create contract from provider
    const Mochacle = new ethers.Contract(
      CONTRACT_ADDRESS.MOCHACLE[provider._network.name],
      ABIS.MOCHACLE_ABI,
      signer);
    
    let return_status = ''
    let transaction_hash = ''
    let transaction_url = ''
    try {
      const score_factor_pre_format = await Mochacle.SCORE_FACTOR();
      const score_factor = Math.floor(ethers.utils.formatUnits(score_factor_pre_format, 0))
    
      const submitTest_tx = await Mochacle.submitTest(
        "0x" + uid,
        "0x" + cid,
        Math.round(fraction * score_factor),
        {value: ethers.utils.parseEther(value.toString())}
      );
      
      const submitTest_receipt = await submitTest_tx.wait()
      const submitTest_receipt_event = await submitTest_receipt.events.find(x => x.event = "submittedTest");
      transaction_hash = submitTest_receipt.transactionHash
      transaction_url = 'https://' + provider._network.name + '.etherscan.io/tx/' + submitTest_receipt.transactionHash
        
      console.log('event', submitTest_receipt_event)
      return_status += 'Successful Mocha Test submission to ' + provider._network.name + '.'
    
    } catch (err) {
      console.log(err)
      return_status += err.toString()
    }

    try {

      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/testSubmission', {
        target_id: uid,
        submitter: address,
        name: address,
        token: address.slice(-10,),
        chain_name: provider._network.name,
        chain_id: provider._network.chainId,
        pass_fraction: fraction,
        targettemplatejs: mocha_script_string,
        packages_required: {},
        transaction_hash: transaction_hash,
        transaction_url: transaction_url
      })

      console.log(res.data)
      return_status += '\nSuccessful Mocha Test submission to testoracle.xyz'
    } catch (err) {
      console.log(err)
      return_status += '\n' + err.toString()
    }
    return return_status
    
}


async function submitMochaSolutionUpload() {
  console.log('you pressed me ... solution upload:', solutionFile)
  // check whether this input exists
  const exist_flag = await MochaTargetExists(mocha_target_input.value) 
  // console.log(mocha_target_input.value)
  // console.log(exist_flag)

  if (exist_flag){
    const success_contract_upload = await uploadMochaSolutionToBlockchainAndServer(mocha_target_input.value, solutionFile.text)
    console.log(success_contract_upload)
    // then submit to testoracle.xyz
    mocha_solution_file_display.innerText = '...'
    upload_mocha_solution_btn.disabled = true
    // re-allow event-listener 
    // TODO: not the right place here
    // addAllEventListenersAgain()

    
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }
}





async function uploadMochaSolutionToBlockchainAndServer(target_id, solution_script) {
  // console.log()

  let provider = PROVIDER.INDUCED
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  const {cid, uid} = cidAndUidFromScriptAndAddress(solution_script, address, provider._network.chainId)
  
  const Mochacle = new ethers.Contract(
    CONTRACT_ADDRESS.MOCHACLE[provider._network.name],
    ABIS.MOCHACLE_ABI,
    signer);
  
  let return_status = ''
  let transaction_hash = ''
  let transaction_url = ''
  let success_flag = true

  try {
    const submitSolution_tx = await Mochacle.submitSolution(
      '0x' + target_id,
      '0x' + uid,
      '0x' + cid,
      {gasLimit: 4000000})
    const submitSolution_receipt = await submitSolution_tx.wait();
    transaction_hash = submitSolution_receipt.transactionHash
    transaction_url = 'https://' + provider._network.name + '.etherscan.io/tx/' + submitSolution_receipt.transactionHash
      
    return_status += 'Successful Mocha Solution submission to ' + provider._network.name + '.'

  } catch (err) {
    success_flag = false
    return_status += err.toString()
  }

  if (success_flag){
    try {
      const packages_required = {}
      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/solutionSubmission', {
        submission_id: uid,
        target_id: target_id,
        submitter: address,
        name: address,
        token: address.slice(-10,),
        chain_name: provider._network.name,
        chain_id: provider._network.chainId,
        submissionjs: solution_script,
        packages_required: packages_required,
        transaction_hash: transaction_hash,
        transaction_url: transaction_url
      })
      console.log(res.data)
      // return res.data

      return_status += "successful submission to the remote server!"
      console.log(return_status)
    } catch (err) {
      return_status += err.toString()
      success_flag = false
    }
  }

  // run the script
  if (success_flag){
    try {
      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/runSubmission', {
            submission_id: uid,
            name: address,
            token: address.slice(-10,)
        })
      console.log(res.data)
      return_status += "successful ran the submission, too!"
      console.log(return_status)
    } catch(err) {
      return_status += err.toString()
      success_flag = false
    }
  }
  
  
  return return_status
}


async function MochaTargetExists(target_id) {
  // should check whether the id exists. So it should be a call to the smart contract
  if (target_id.length>0){
    return true
  }
  return false
}


async function submitMochaTestUpload(){
  console.log('you pressed me', testFile)
  // first submit to blockchain
  const fraction_in_perc = parseFloat(pass_fraction.value)
  const value = parseFloat(eth_reward.value)
  // console.log('fraction_in_perc', fraction_in_perc)
  // console.log('value', value)
  if (!!fraction_in_perc & !!value){
    const fraction = fraction_in_perc / 100
    const success_contract_upload = await uploadMochaTestToBlockchainAndServer(testFile.text, fraction, value)
    console.log(success_contract_upload)
    // then submit to testoracle.xyz
    mocha_test_file_display.innerText = '...'
    upload_mocha_test_btn.disabled = true
    
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }

}




export {
  rewardSolutionHandler,
  submitMochaTestUpload,
  submitMochaSolutionUpload
}