const axios = require('axios')
const fs = require('fs')
const myArgs = process.argv.slice(2);
const argument = myArgs[0]
require('dotenv').config({ path: '.env' })
let HOSTPORT = ''
if (process.env.REMOTE==1) {
  HOSTPORT = process.env.SERVERHOST_DOCKER_REMOTE
} else {
  HOSTPORT = (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
}


async function changePassword(name, old_token, new_token){
    try {
        const response = await axios.post(HOSTPORT + '/changePassword', {
          name: name,
          token: old_token,
          new_token: new_token,
        })
        return response.data
    } catch (e) {
        return e.toJSON().message
    }
}

module.exports = {
    changePassword
};