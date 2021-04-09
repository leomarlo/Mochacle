const axios = require('axios')
const fs = require('fs')
require('dotenv').config({'path': '.env'})
// console.log(test_file_string)
const myArgs = process.argv.slice(2);
const argument = myArgs[0]

async function add_users(){
    axios
        .post('http://localhost:8080/adminAddUsers', {
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
        .post('http://localhost:8080/adminBlockUsers', {
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
        .post('http://localhost:8080/adminUnblockUsers', {
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
        .post('http://localhost:8080/adminGetUsersList', {
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