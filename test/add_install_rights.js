const {addUsers, getUsers, installRightsForUsers} = require("../utilities/admin.js");
const {changePassword} = require("../utilities/users.js");
require('dotenv').config({'path': '../.env'})
async function add_install_rights(name){
    const pr = await installRightsForUsers(
        process.env.ADMIN_TOKEN,
        [name])
    console.log(pr)
};

const name = process.env.ADDRESS_BOB
add_install_rights(name)

