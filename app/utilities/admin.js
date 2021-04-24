
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


async function addUsers(admin_token, new_user, init_token){
    try {
        const response = await axios.post(HOSTPORT + '/adminAddUsers', {
          token: admin_token,
          new_user: new_user,
          init_token: init_token,
        })
        return response.data
    } catch (e) {
        return e.toJSON().message
    }
  }

async function getUsers(admin_token){
    try {
        const response = await axios.post(HOSTPORT + '/adminGetUsersList', {
            token: admin_token,
        })
        return response.data
    } catch (e) {
        return e.toJSON().message
    }
}

async function installRightsForUsers(admin_token, users){
    try {
        const response = await axios.post(HOSTPORT + '/adminAddInstallRightUsers', {
          token: admin_token,
          install_right_users: users,
        })
        return response.data
    } catch (error) {
        return e.toJSON().message
    }
  }
  

module.exports = {
    addUsers, 
    getUsers,
    installRightsForUsers
};