const axios = require('axios')
const fs = require('fs')
const test_file_string = fs.readFileSync("./app/test_template.js")
// console.log(test_file_string)
axios
  .post('http://localhost:8080/testSubmission', {
    target_id:243,
    submitter:'charlie',
    pass_fraction: 0.8,
    targettemplatejs: test_file_string.toString(),
  })
  .then(res => {
    console.log(`statusCode: ${res.status}`)
    console.log(res.data)
  })
  .catch(error => {
    console.error(error)
  })
// axios
//   .post('http://0.0.0.0:1234/dostuff', {
//     text: 'blablablab this text goes eererererree'
//   })
//   .then(res => {
//     console.log(`statusCode: ${res.statusCode}`)
//     console.log(res)
//   })
//   .catch(error => {
//     console.error(error)
//   })