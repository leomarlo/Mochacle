const axios = require('axios')

const fs = require('fs')
const submission_file_string = fs.readFileSync("./app/bob_submission.js")

axios
  .post('http://localhost:8080/solutionSubmission', {
    submission_id:11215,
    target_id:243,
    submitter:'bob',
    submissionjs: submission_file_string.toString(),
  })
  .then(res => {
    console.log(`statusCode: ${res.status}`)
    console.log(res.data)
  })
  .catch(error => {
    console.error(error)
  })
