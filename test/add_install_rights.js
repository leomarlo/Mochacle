const {addUsers, getUsers, installRightsForUsers} = require("../app/utilities/admin.js");
const {changePassword} = require("../app/utilities/users.js");
require('dotenv').config({'path': '../.env'})
async function add_install_rights(name){
    const pr = await installRightsForUsers(
        process.env.ADMIN_TOKEN,
        [name])
    console.log(pr)
};

const name = process.env.ADDRESS_BOB
add_install_rights(name)

