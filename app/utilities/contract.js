import dotenv from 'dotenv'
import {ethers} from 'ethers'
import axios from 'axios'
dotenv.config()


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

  export {
    rewardSolutionHandler,
  }