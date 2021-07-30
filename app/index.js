import {ethers} from 'ethers';
// import {uploadMochaTestToBlockchain} from './web3/contractUtilities';
import {connect, web3Modal} from './web3/web3tools'
import fs from 'fs'
import crypto from 'crypto'
import https from 'https'
import axios from 'axios'
import dotenv from 'dotenv'
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('javascript', javascript);

// upload = require("express-fileupload"),
dotenv.config()
console.log('server ip is ',process.env.SERVERHOST_DOCKER_REMOTE)
// const agent = new https.Agent({  
//   rejectUnauthorized: false
// });  //https://github.com/axios/axios/issues/535


// console.log(htmlll)

const ticket_div = document.getElementById("tickets-div")
const mocha_target_input = document.getElementById("test-script-id-input")
const solution_reward_input = document.getElementById("solution-id-input")
const user_address = document.getElementById("user-info-address")
const user_network = document.getElementById("user-info-network")
const user_ETH_balance = document.getElementById("user-info-ETH")
const user_LINK_balance = document.getElementById("user-info-LINK")
const user_registered = document.getElementById("user-info-registered-on-mocha")



const contract_address = document.getElementById("contract-info-address")
const contract_network = document.getElementById("contract-info-network")
const contract_ETH_balance = document.getElementById("contract-info-ETH")
const contract_LINK_balance = document.getElementById("contract-info-LINK")


const mocha_test_file = document.getElementById("mocha-test-upload-file")
const mocha_test_file_display = document.getElementById("mocha-filename-info")
const mocha_solution_file = document.getElementById("mocha-solution-upload-file")
const mocha_solution_file_display = document.getElementById("solution-filename-info")
const connect_btn = document.getElementById("connect-btn")
const upload_mocha_test_btn = document.getElementById("submit-test-btn")
const upload_mocha_solution_btn = document.getElementById("submit-solution-btn")
const pass_fraction = document.getElementById("pass-fraction-input")
const eth_reward = document.getElementById("reward-input")


const clear_display_btn = document.getElementById("clear-display-btn")



const WEB3 = {PROVIDER: null}
const STRINGIFIED_FILES = {
  test: {
    meta: null,
    text: null
  },
  solution: {
    meta: null,
    text: null
  },
}

const SCORE_FACTOR = 1000

let LINK_ABI_RAW = fs.readFileSync('./contracts/interfaces/LINK.json');
let LINK_ABI = JSON.parse(LINK_ABI_RAW);
let TESTORACLE_ABI_RAW = fs.readFileSync('./contracts/interfaces/TestOracle.json');
let TESTORACLE_ABI = JSON.parse(TESTORACLE_ABI_RAW);

const CONTRACT_ADDRESS = {
  TESTORACLE: {},
  LINK: {}
}

try {
  CONTRACT_ADDRESS.TESTORACLE.rinkeby = fs.readFileSync("./contracts/addresses/Mochacle_rinkeby.txt").toString()
  CONTRACT_ADDRESS.TESTORACLE.kovan = fs.readFileSync("./contracts/addresses/Mochacle_kovan.txt").toString()
} catch {
  console.log('Could not load contract addresses')
}


mocha_test_file.addEventListener("change",handleMochaTestFile, false)
mocha_solution_file.addEventListener("change",handleMochaSolutionFile)
upload_mocha_test_btn.addEventListener("click", submitMochaTestUpload)
upload_mocha_solution_btn.addEventListener("click", submitMochaSolutionUpload)
connect_btn.addEventListener("click", loginHandler);
mocha_target_input.addEventListener("click", mochaTestDisplayHandler)
solution_reward_input.addEventListener("click", solutionDisplayHandler)


function addAllEventListenersAgain(){

  mocha_target_input.addEventListener("click", mochaTestDisplayHandler)
  solution_reward_input.addEventListener("click", solutionDisplayHandler)
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
    let provider = WEB3.PROVIDER
    const signer = provider.getSigner(0);
    const address = await signer.getAddress();
    const {cid, uid} = cidAndUidFromScriptAndAddress(mocha_script_string, address, provider._network.chainId)
    console.log('provider', provider)
    console.log('provider._network', provider._network)
    console.log('signer', signer)
    // create contract from provider
    TestOracle = new ethers.Contract(
      CONTRACT_ADDRESS.TESTORACLE[provider._network.name],
      TESTORACLE_ABI,
      signer);
    
    let return_status = ''
    let transaction_hash = ''
    let transaction_url = ''
    try {
      const score_factor_pre_format = await TestOracle.SCORE_FACTOR();
      const score_factor = Math.floor(ethers.utils.formatUnits(score_factor_pre_format, 0))
    
      const submitTest_tx = await TestOracle.submitTest(
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
  console.log('you pressed me ... solution upload:', STRINGIFIED_FILES.solution)
  // check whether this input exists
  const exist_flag = await MochaTargetExists(mocha_target_input.value) 
  // console.log(mocha_target_input.value)
  // console.log(exist_flag)

  if (exist_flag){
    const success_contract_upload = await uploadMochaSolutionToBlockchainAndServer(mocha_target_input.value, STRINGIFIED_FILES.solution.text)
    console.log(success_contract_upload)
    // then submit to testoracle.xyz
    upload_mocha_solution_btn.disabled = true
    // re-allow event-listener 
    // TODO: not the right place here
    addAllEventListenersAgain()

    
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }
}


async function uploadMochaSolutionToBlockchainAndServer(target_id, solution_script) {
  // console.log()

  let provider = WEB3.PROVIDER
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  const {cid, uid} = cidAndUidFromScriptAndAddress(solution_script, address, provider._network.chainId)
  
  TestOracle = new ethers.Contract(
    CONTRACT_ADDRESS.TESTORACLE[provider._network.name],
    TESTORACLE_ABI,
    signer);
  
  let return_status = ''
  let transaction_hash = ''
  let transaction_url = ''
  let success_flag = true

  try {
    const submitSolution_tx = await TestOracle.submitSolution(
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
    } catch(e) {
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
  console.log('you pressed me', STRINGIFIED_FILES.test)
  // first submit to blockchain
  const fraction_in_perc = parseFloat(pass_fraction.value)
  const value = parseFloat(eth_reward.value)
  console.log('fraction_in_perc', fraction_in_perc)
  console.log('value', value)
  if (!!fraction_in_perc & !!value){
    const fraction = fraction_in_perc / 100
    const success_contract_upload = await uploadMochaTestToBlockchainAndServer(STRINGIFIED_FILES.test.text, fraction, value)
    console.log(success_contract_upload)
    // then submit to testoracle.xyz
    upload_mocha_test_btn.disabled = true
    
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }

}

function fitsMochaSolutionCriteria(file_data){
  let pass = true
  let message = 'Your file does not satisfy basic criteria for a mocha solution file!'
  if (file_data.meta.type.indexOf('javascript')<0){
    pass = false
    message += '\nIt should be a javascript file (file extension = ".js")'
  }
  return {pass, message}

  // in principle it should also check whether all the methods are defined that are imported in the target script
}

function fitsMochaTestCriteria(file_data){
  let pass = true
  let message = 'Your file does not satisfy basic criteria for a mocha test file!'
  if (file_data.meta.type.indexOf('javascript')<0){
    pass = false
    message += '\nIt should be a javascript file (file extension = ".js")'
  }
  const condition1 = file_data.text.indexOf('require("<<<submission>>>")')
  const condition2 = file_data.text.indexOf("require('<<<submission>>>')")
  if (!(condition1 || condition2)){
    pass = false
    message += '\nIt should require the solution functions via \'require("<<<submission>>>")\''
  }
  if (pass){
    message = 'The file passed the requirements!'
  }
  return {pass, message}
}


async function solutionDisplayHandler(){

  console.log('inside solutionDisplayHandler')
  solution_reward_input.style.cursor = 'text'
  solution_reward_input.placeholder = 'Select solution id'
  // TODO: go back to  mocha_target_input.placeholder = 'Select mocha scripts and their ids' at callback X
  displayMySolutionIds()
  // remove event listener
  solution_reward_input.removeEventListener("click", solutionDisplayHandler)
  // TODO: addeventlistener again when submission has been clicked or anything else.
}


async function mochaTestDisplayHandler(){
  console.log('inside event listener')
  // first change the cursor style to text
  mocha_target_input.style.cursor = 'text'
  mocha_target_input.placeholder = 'Select mocha script id'
  // TODO: go back to  mocha_target_input.placeholder = 'Select mocha scripts and their ids' at callback X
  displayMochaTest()
  // remove event listener
  mocha_target_input.removeEventListener("click", mochaTestDisplayHandler)
  // TODO: addeventlistener again when submission has been clicked or anything else.
}

function getColorFromSolutionProperties(properties){
  if (properties.pass==-1) {
    return "warning"
  } else if (properties.pass==0){
    return "danger"
  } else if (properties.pass==1){
    return "success"
  } else {
    return "secondary"
  }
}

function getColorFromSolutions(solutions) {
  if (solutions.length>0){
    return "secondary"
  } else {
    return "secondary"
  }
}


async function displayMySolutionIds() {
  ticket_div.innerHTML = ''
  solution_reward_input.innerHTML = ''

  const tile_contents = new Array()
  try {
    let provider = WEB3.PROVIDER
    const signer = provider.getSigner(0);
    const address = await signer.getAddress();
    let base_url = process.env.SERVERHOST_DOCKER_REMOTE + '/users/' + address;
    const res = await axios.get(base_url)
    const targets = res.data.test_submissions;
    // const submissionids = new Object()

    for (let i=0; i<targets.length; i++){
      let this_target_url = process.env.SERVERHOST_DOCKER_REMOTE + '/target_ids/' + targets[i]
      let respo = await axios.get(this_target_url)
      let solutions = new Array()
      for (const [id, properties] of Object.entries(respo.data.submissions)){
        solutions.push({
          id: id,
          text: id,
          dom_id: "paste-solution-" + id,
          score: properties.score,
          bootstrap_color: getColorFromSolutionProperties(properties),
          pass: properties.pass
        })
      }
      let this_content = {
        solutions: solutions,
        id: "solution-for-" + targets[i],
        bootstrap_color: getColorFromSolutions(solutions),
        header: "Solutions for test:\n" + targets[i]
      }

      tile_contents.push(this_content)
    }
  } catch (err) {
    console.log(err)
  }

  for (let k=0; k<tile_contents.length; k++) {

    addSolutionsTile(tile_contents[k])
    let sols = tile_contents[k].solutions
    for (let m=0; m<sols.length; m++) {
      let solution_link = document.getElementById(sols[m].dom_id)
      solution_link.addEventListener('click', () => {
        if (solution_reward_input.value==sols[m].id){
          solution_reward_input.value = ''
        } else {
          solution_reward_input.value = sols[m].id
        }
      })
    }
    
  }
}

async function displayMochaTest(){
    // get all the target_ids from axios call
    ticket_div.innerHTML = ''
    mocha_target_input.innerHTML = ''
    try{
      let ticket_divs = new Array()
      let base_url = process.env.SERVERHOST_DOCKER_REMOTE + '/target_ids'
      const res = await axios.get(base_url)
      // console.log(res.data)
      for (let j=0; j<res.data.length; j++){
        try{
          let target_url = base_url + '/' + res.data[j].id
          const target_response = await axios.get(target_url)
          // console.log(target_response.data)
           
          const tile_content = new Object()
          tile_content.title = res.data[j].id
          tile_content.id = res.data[j].id
          tile_content.button_name = 'target-btn-' + res.data[j].id
          tile_content.submitter = target_response.data.name
          tile_content.mocha_script = target_response.data.targettemplatejs
          tile_content.url = target_url
          tile_content.status = res.data[j].status
          if (res.data[j].status=="uploaded"){
            tile_content.bootstrap_color = 'success'
            tile_content.header = 'Waiting for submissions'
          } else if (res.data[j].status=="has been solved") {
            tile_content.bootstrap_color = 'danger'
            tile_content.header = 'Has been passed!'
          } else if (res.data[j].status=="has submissions") {
            tile_content.bootstrap_color = 'warning'
            tile_content.header = 'Has submissions, but none passed!'
          } else {
            tile_content.bootstrap_color = 'default'
            tile_content.header = 'Status unclear!'
          }
          tile_content.link_text = `Link to the submission information`  
          ticket_divs.push({
            id: res.data[j].id,
            tile_content: tile_content
          })
        } catch (err_target) {
          console.log(err_target)
        }
      }

      for (let k=0; k<ticket_divs.length; k++){
        if (ticket_divs[k].tile_content.status=="has been solved"){
          continue;
        }
        addMochaTestTile(ticket_divs[k].tile_content)
        const tile_button = document.getElementById(ticket_divs[k].tile_content.button_name)
        tile_button.addEventListener('click', ()=>{
          if (mocha_target_input.value==ticket_divs[k].id){
            mocha_target_input.value = ''
          } else {
            mocha_target_input.value = ticket_divs[k].id
            // reset the selected file to zero
            mocha_solution_file_display.innerText = '...'
          }
        })
      }

    } catch (err) {
      console.log(err)
    } 
}


function addSolutionsTile(tile_content){
  const card = document.createElement("div")
  card.setAttribute("id", "card-" + tile_content.id);
  card.setAttribute("class", "card border border-3");
  card.setAttribute("style", "width: 100%; margin-bottom:4%");

  const card_header = document.createElement("div")
  card_header.setAttribute("class", "card-header bg-" + tile_content.bootstrap_color)

  const card_body = document.createElement("div")
  card_body.setAttribute("style", "text-align:left; padding:5px;margin-bottom:0%")

  if (tile_content.solutions.length==0) {

    const card_title = document.createElement("h5")
    card_title.setAttribute("class", "card-title ml-4");
    let card_title_text = document.createTextNode("No submissions for this test, yet!")
    card_title.appendChild(card_title_text)


    card_body.appendChild(card_title)

  } else {
    const ul_el = document.createElement("ul");
    ul_el.setAttribute("class", "list-group list-group-flush");

    for (let j=0; j<tile_content.solutions.length; j++){
      let li_el = document.createElement("li");
      let li_el_class_attriutes = "list-group-item"
      li_el_class_attriutes += " bg-" + tile_content.solutions[j].bootstrap_color
      li_el_class_attriutes += " border border-dark rounded mb-1 ml-4 mr-6"
      li_el.setAttribute("id", tile_content.solutions[j].dom_id);
      li_el.setAttribute("class", li_el_class_attriutes);
      li_el.setAttribute("style", "cursor: pointer;") //"  padding:5px; margin-bottom:0%;")

      // li_el_link.setAttribute("href", tile_content.solutions[j].url)
      // li_el_link.setAttribute("class", "card-link")
      const li_text = document.createTextNode(tile_content.solutions[j].id);
      // li_el_link.appendChild(li_text)
      // li_el.appendChild(li_el_link)
      li_el.appendChild(li_text)
      ul_el.appendChild(li_el)
      
    }
    // if (tile_content.solutions.length==0) {
    //   li_el.appendChild(li_el_link)
    // }

    card_body.appendChild(ul_el)

  }
  
  const card_header_text = document.createTextNode(tile_content.header)
  card_header.appendChild(card_header_text)
  card.appendChild(card_header)


  card.appendChild(card_body)

  ticket_div.appendChild(card);

}

function addMochaTestTile(tile_content){
  
  const card = document.createElement("div");
  card.setAttribute("id", "card-" + tile_content.id);
  card.setAttribute("class", "card");
  card.setAttribute("style", "width: 100%; margin-bottom:4%");

  const card_header = document.createElement("div")
  card_header.setAttribute("class", "card-header bg-" + tile_content.bootstrap_color)
  
  const card_body = document.createElement("div")
  card_body.setAttribute("style", "text-align:left; padding:5px;margin-bottom:0%")

  const card_title = document.createElement("h5")
  card_title.setAttribute("class", "card-title");
  
  const card_submitter = document.createElement("div")
  card_submitter.setAttribute("style", "width:100%");
  
  const card_id = document.createElement("div")
  card_id.setAttribute("style", "width:100%");

  const card_footer = document.createElement("div")
  card_footer.setAttribute("style", "cursor: pointer; text-align:left; padding:5px; margin-bottom:0%;")
  card_footer.setAttribute("class", "card-footer")
  card_footer.setAttribute("id", tile_content.button_name);
  
  // const card_button = document.createElement("button")
  // card_button.setAttribute("type", "button");
  // card_button.setAttribute("id", tile_content.button_name);
  // card_button.setAttribute("class", "btn");
  // card_button.setAttribute("style", "background-color:#e7e7e7;");

  const card_script_details = document.createElement("details")
  const card_script_summary = document.createElement("summary")
  const card_script_content = document.createElement("div")
  card_script_content.setAttribute("style", "display:block; padding:5px; background-color:#e7e7e7;")

  const card_link = document.createElement("a")
  card_link.setAttribute("href", tile_content.url)
  card_link.setAttribute("class", "card-link")

  const card_header_text = document.createTextNode(tile_content.header)
  const card_title_text = document.createTextNode(tile_content.title)
  const card_submitter_text = document.createTextNode("submitter: " + tile_content.submitter)
  const card_id_text = document.createTextNode("target_id: " + tile_content.id)
  // const card_button_text = document.createTextNode("Select this mocha script")
  const card_script_summary_text = document.createTextNode("Show submitted target mocha script")
  // const mocha_script_highlighted = hljs.highlight(tile_content.mocha_script, {language: 'javascript'}).value
  const all_lines = tile_content.mocha_script.split('\n')
  const mocha_script_highlighted = all_lines.map((a)=>{return "<div>" + hljs.highlight(a, {language: 'javascript'}).value + "</div>"}).join("")
  
  console.log(tile_content.mocha_script)
  // console.log(mocha_script_highlighted)
  // const card_script_content_text = document.createTextNode(mocha_script_highlighted)
  const card_link_text = document.createTextNode(tile_content.url)
  const card_footer_text = document.createTextNode("Click here to select this mocha script")

  card_header.appendChild(card_header_text)
  card.appendChild(card_header)

  // append card title to the card body
  card_title.appendChild(card_title_text)
  card_body.appendChild(card_title)

  // append card_submitter paragraph to the card body
  card_submitter.appendChild(card_submitter_text)
  card_body.appendChild(card_submitter)

  // append card_id paragraph to the card body
  card_id.appendChild(card_id_text)
  card_body.appendChild(card_id)

  // append card_button to the card body
  // card_button.appendChild(card_button_text)
  // card_body.appendChild(card_button)

  card_script_summary.appendChild(card_script_summary_text)
  card_script_details.appendChild(card_script_summary)
  // card_script_content.appendChild(card_script_content_text)
  card_script_content.innerHTML = mocha_script_highlighted
  card_script_details.appendChild(card_script_content)
  card_body.appendChild(card_script_details)

  card_link.appendChild(card_link_text)
  card_body.appendChild(card_link)

  card.appendChild(card_body)

  card_footer.appendChild(card_footer_text)
  card.appendChild(card_footer)

  ticket_div.appendChild(card);
}



function handleMochaTestFile() {
  const fileList = this.files; 
  if (fileList.length>0){
    const file = fileList[0]
    fileSpecs = {
      name: file.name,
      size: file.size,
      type: file.type
    }
    mocha_test_file_display.innerText = file.name
    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
      // when the reader is done, the content is in reader.result.
      const test = {
        meta: fileSpecs,
        text: reader.result
      }
      fitnessReport = fitsMochaTestCriteria(test)
      if (fitnessReport.pass){
        STRINGIFIED_FILES.test = test
        upload_mocha_test_btn.disabled = false
        console.log('congratulation')
      } else {
        upload_mocha_test_btn.disabled = true
        alert(fitnessReport.message);
      }
    };
    reader.readAsText(this.files[0])

  } else {
    console.log('No file specified')
  }
}


function handleMochaSolutionFile() {
  const fileList = this.files; 
  if (fileList.length>0){
    const file = fileList[0]
    fileSpecs = {
      name: file.name,
      size: file.size,
      type: file.type
    }
    mocha_solution_file_display.innerText = file.name
    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
      // when the reader is done, the content is in reader.result.
      const solution = {
        meta: fileSpecs,
        text: reader.result
      }
      fitnessReport = fitsMochaSolutionCriteria(solution)
      if (fitnessReport.pass){
        STRINGIFIED_FILES.solution = solution
        console.log('congratulation! Fitness passed!')
      } else {
        alert(fitnessReport.message);
      }

      if (fitnessReport.pass && testTargetId(mocha_target_input.value)){
        upload_mocha_solution_btn.disabled = false
      } else {
        upload_mocha_solution_btn.disabled = true
      }

    };
    reader.readAsText(this.files[0])

  } else {
    console.log('No file specified')
  }
}

function testTargetId(target_id) {
  const condition_1 = target_id.length==32
  // const condition_2 = Only HEX decimal digits
  const condition = condition_1
  return condition
}

async function loginHandler () {
  if (connect_btn.innerHTML=='Logout'){
    web3Modal.clearCachedProvider();
    reset()
    connect_btn.innerHTML='Connect to Web3'
  } else {
    console.log('Connecting to web3')
    let provider = await connect();
    let signer = provider.getSigner(0);
    let address = await signer.getAddress();
    WEB3.PROVIDER = provider
    console.log('address is', address)
    const rawBalance = await provider.getBalance(address);
    const balance = Math.round(ethers.utils.formatEther(rawBalance) * 10000) / 10000;

    // update user information
    user_address.innerHTML = ellipse_address(address)
    user_network.innerHTML = provider._network.name
    user_ETH_balance.innerHTML = "" + balance
    user_LINK_balance.innerHTML = await getLinkBalance(address, provider, provider._network.name)

    // update contract information
    // let contract_file_name = './contracts/addresses/Mochacle_' + provider._network.name + '.txt'
    // console.log(contract_file_name)
    // contr_address = fs.readFileSync(contract_file_name).toString()
      
    // try {
    //   contract_address.innerHTML = ellipse_address(contr_address)
    //   const contractrawBalance = await provider.getBalance(contr_address);
    //   const contractbalance = Math.round(ethers.utils.formatEther(contractrawBalance) * 10000) / 10000;
    //   contract_ETH_balance.innerHTML = "" + contractbalance
    //   contract_LINK_balance.innerHTML = user_LINK_balance.innerHTML = await getLinkBalance(contr_address, provider, provider._network.name)
    //   contract_network.innerHTML = provider._network.name
    // } catch (err) {
    //   console.log(err)
    //   contract_address.innerHTML = 'not known'
    //   contract_network.innerHTML = provider._network.name
    //   contract_ETH_balance.innerHTML = "not known"
    //   contract_LINK_balance.innerHTML = 'not known'
    // }
    


    const registration = await registerToMochaServer(address, provider._network.name)
    user_registered.innerHTML = registration["message"]
    connect_btn.innerHTML='Logout'
  }
}


function ellipse_address(name){
  const L = name.length
  const k = 4
  if (L>(2*k + 2)){
    return name.slice(0,2+k) + '...' + name.slice(-4,)
  }
  return name
}

async function getLinkBalance(address, provider, network){
  let LINK_ADDRESS = ''
  if (network=='kovan'){
    LINK_ADDRESS = process.env.LINK_CONTRACT_KOVAN
  } else if (network=='rinkeby'){
    LINK_ADDRESS = process.env.LINK_CONTRACT_RINKEBY
  } else {
    return ''
  }

  const LINKcontract = new ethers.Contract(
    LINK_ADDRESS,
    LINK_ABI,
    provider);
  const linkBalance = await LINKcontract.balanceOf(address);
  return ethers.utils.formatEther(linkBalance)
}

function reset(){
  WEB3.PROVIDER = null
  user_ETH_balance.innerHTML = ""
  user_LINK_balance.innerHTML = ""
  user_network.innerHTML = ""
  user_address.innerHTML = ""
  user_registered.innerHTML = ""

}


async function registerToMochaServer(address, network){
  let MOCHA_SERVER_URL = getMochaServerURL()
  try {
    // process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';
    const response = await axios.post(MOCHA_SERVER_URL + '/registerNewUser', {
      token: address.slice(-10,),
      address: address,
      networks: [network, 'kovan', 'rinkeby'],
    })
    // process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;
    return {
      "message": response.data,
      "error": false
    }
  } catch (e) {
    return {
      "message": e,
      "error": true
    }
  }
}

function getMochaServerURL(){
  if (process.env.REMOTE==1) {
    return process.env.SERVERHOST_DOCKER_REMOTE
  } else {
    return (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
  }
}