const axios = require('axios')

axios
  .post('http://localhost:8080/runSubmission', {
    submission_id:11215
  })
  .then(res => {
    console.log(`statusCode: ${res.status}`)
    console.log(res.data)
  })
  .catch(error => {
    console.error(error)
  })