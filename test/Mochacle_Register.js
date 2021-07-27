const hre = require("hardhat");
const {changePassword, registerNewUser} = require("../utilities/users.js");
require('dotenv').config({'path': '../.env'})

network_name = hre.network.name

let address_alice = process.env.ADDRESS_ALICE
let address_bob = process.env.ADDRESS_BOB
let address_charlie = process.env.ADDRESS_CHARLIE

const passwords = new Object()
passwords["alice"] = address_alice.slice(-10,) //process.env.ALICE_NEW_TOKEN
passwords["bob"] = address_bob.slice(-10,) //process.env.BOB_NEW_TOKEN
passwords["charlie"] = address_charlie.slice(-10,) //process.env.CHARLIE_NEW_TOKEN

async function registerAll() {
    try {
        let pr_alice = await registerNewUser(
            address_alice,
            passwords['alice'],
            network_name)
        console.log(pr_alice)
        let pr_bob = await registerNewUser(
            address_bob,
            passwords['bob'],
            network_name)
        console.log(pr_bob)
        let pr_charlie = await registerNewUser(
            address_charlie,
            passwords['charlie'],
            network_name)
        console.log(pr_charlie)
    } catch (err) {
        console.log(err)
    }
    
}


registerAll()
    .then(()=>{console.log("hurray, we registered all")})
    .catch(console.log)