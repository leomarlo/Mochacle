const axios = require('axios')
const fs = require('fs')
require('dotenv').config({ path: '.env' })

async function create_new_Pass(new_token){
    axios
        .post('http://localhost:8080/changePassword', {
            name:'Bob',
            token: process.env.INIT_TOKEN,
            new_token: new_token
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
}


