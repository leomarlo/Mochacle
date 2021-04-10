const axios = require('axios')
const fs = require('fs')
require('dotenv').config({'path': '.env'})
// console.log(test_file_string)
const myArgs = process.argv.slice(2);
const argument = myArgs[0]

let HOSTPORT = (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER : process.env.SERVERHOST_LOCAL)

async function add_users(){
    axios
        .post(HOSTPORT + '/adminAddUsers', {
            token:process.env.ADMIN_TOKEN,
            new_user:['Alice', 'Bob', 'Charlie', 'Dan', 'Mike', 'Eve', 'Francis', 'George']
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
}

async function block_these_users(names){
    axios
        .post(HOSTPORT + '/adminBlockUsers', {
            token:process.env.ADMIN_TOKEN,
            block_these_users: names // ['Alice', 'Bob', 'Charlie', 'Dan', 'Mike', 'Eve', 'Francis', 'George']
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
    }

async function unblock_these_users(names){
    axios
        .post(HOSTPORT + '/adminUnblockUsers', {
            token:process.env.ADMIN_TOKEN,
            unblock_these_users: names // ['Alice', 'Bob', 'Charlie', 'Dan', 'Mike', 'Eve', 'Francis', 'George']
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
    }

async function getUserList(){
    axios
        .post(HOSTPORT + '/adminGetUsersList', {
            token:process.env.ADMIN_TOKEN
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
    }

async function installPackages(packages){
    axios
        .post(HOSTPORT + '/adminInstallPackages', {
            token:process.env.ADMIN_TOKEN,
            packages:packages
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
    }

async function installUsers(users){
    const users_and_exceptions = new Object()
    for (let j=0; j<users.length; j++){
        users_and_exceptions[users[j]] = {'exceptions': []}
    }
    axios
        .post(HOSTPORT + '/adminAddInstallRightUsers', {
            token:process.env.ADMIN_TOKEN,
            install_right_users:users_and_exceptions,
        })
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res.data)
        })
        .catch(error => {
            console.error(error)
        })
    }
    


if (argument=='getUsers'){
    getUserList()
}
if (argument=='addUsers'){
    add_users()
}
if (argument=='blockUser'){
    let block_these = new Array()
    for (let i=1; i<myArgs.length; i++){
        block_these.push(myArgs[i])
    }
    block_these_users(block_these)
}
if (argument=='unblockUser'){
    let unblock_these = new Array()
    for (let i=1; i<myArgs.length; i++){
        unblock_these.push(myArgs[i])
    }
    unblock_these_users(unblock_these)
}
if (argument=='installPackages'){
    if (myArgs[1]){
        const packages = myArgs.slice(1)
        installPackages(packages)
    }
}
if (argument=='installUsers'){
    if (myArgs[1]){

        let these_users = new Array()
        for (let i=1; i<myArgs.length; i++){
            these_users.push(myArgs[i])
        }
        installUsers(these_users)
    } else {
        console.log("sorry, but you havent supplied any users")
    }

}
