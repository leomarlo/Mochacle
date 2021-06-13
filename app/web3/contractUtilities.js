
import dotenv from 'dotenv'
import {ethers} from 'ethers'
import fs from 'fs'
dotenv.config()

// const TestOracle_ABI_RAW = fs.readFileSync('./contractInterfaces/TestOracle.json');
// const TestOracle_ABI = JSON.parse(TestOracle_ABI_RAW)




function cidAndUidFromScriptAndAddress(script, address){
  let cid = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(script)
      .digest('hex')
  const uid_20byte = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(cid + address)
      .digest('hex')
  // cast into 16-byte unique identifyer
  const uid = uid_20byte.slice(0,32)
  return {cid, uid} 
}

async function uploadMochaTestToBlockchain(mocha_script_string,
                        fraction,
                        score_factor,
                        value,
                        submitter_address,
                        provider){

    // get content identifyer and unique id for this mocha test submission
    const {cid, uid} = cidAndUidFromScriptAndAddress(
                          mocha_script_string, submitter_address)
    console.ĺog('TestOracle_ABI', TestOracle_ABI)

    // create contract from provider
    TestOracle = new ethers.Contract(
      submitter_address,
      TestOracle_ABI,
      provider);

    try {
      const submitTest_tx = await TestOracle.submitTest(
        "0x" + uid,
        "0x" + cid,
        Math.round(fraction * score_factor),
        {value: ethers.utils.parseEther(value.toString())}
      );
      const submitTest_receipt = await submitTest_tx.wait()
      const submitTest_receipt_event = await submitTest_receipt.events.find(x => x.event = "submittedTest");
      console.log(submitTest_receipt_event)
      return 'successful submission'
    } catch (err) {
      console.log(err)
      return err
    }
}
  // let mocha_script_hash = crypto
  //         .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
  //         .update(mocha_script_string)
  //         .digest('hex')
  // const test_id_20byte = crypto
  //         .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
  //         .update(mocha_script_hash + address_charlie)
  //         .digest('hex')
  // test_id = test_id_20byte.slice(0,32)
  
  
  // const pass_fraction = 0.9
  // submissionObj.test_script = mocha_script_string;
  // submissionObj.test_id = test_id;
  // submissionObj.submit_test_id = "0x" + test_id;
  // submissionObj.submit_mocha_test_bytes20 = "0x" + mocha_script_hash;
  // submissionObj.pass_fraction = pass_fraction;
  // // console.log('submissionObj', submissionObj)

  // const packages_required = {
  //         'fs': '1.1.1',
  //         'random': '1.1.1'
  //     }

  // const pr = await submitTest(
  //         address_charlie,
  //         charlies_new_password,
  //         mocha_script_string,
  //         test_id,
  //         pass_fraction,
  //         packages_required,
  //     )
  // console.log(pr.status)

export default {
  uploadMochaTestToBlockchain,
  cidAndUidFromScriptAndAddress
}