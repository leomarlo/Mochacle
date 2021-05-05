const { assert, expect } = require("chai");
const fs = require("fs")
const crypto = require('crypto');
const {submitTest, submitSolution, runSubmission} = require("../app/utilities/submission.js");
const {addUsers, getUsers, installRightsForUsers} = require("../app/utilities/admin.js");
const {changePassword} = require("../app/utilities/users.js");
require('dotenv').config({'path': '../.env'})

console.log('start the test')
describe("Test Mocha Server Interaction", async function (){
    // the address names are their addresses
    const alice_name = process.env.ADDRESS_ALICE
    const bob_name = process.env.ADDRESS_BOB
    const charlie_name = process.env.ADDRESS_CHARLIE
    const UserPasswords = new Object()
    UserPasswords[alice_name] = 'wonderland'
    UserPasswords[bob_name] = 'dylan'
    UserPasswords[charlie_name] = 'sheen'
    UserPasswords['Dan'] = 'cing'
    UserPasswords['Mike'] = 'shetysonen'

    console.log(JSON.stringify(UserPasswords))
    const init_token = 'some_weird_token'

    all_users = Object.keys(UserPasswords)
    // this.timeout(55000);
    describe("Initialize Users", async function(){

        it ("Admin should check if there are users registered on the mocha server", async function(){
            // this.timeout(5000);
            const pr = await getUsers(process.env.ADMIN_TOKEN)
            console.log(pr)
        });
        it("Admin should create three users: Alice, Bob, Charlie, Dan and Mike", async function(){  
            // this.timeout(5000);
            const pr = await addUsers(process.env.ADMIN_TOKEN, all_users, init_token)
            // console.log(pr)

        });
        it ("Admin should check now whether the users are inside the mocha server", async function(){
            // this.timeout(5000);
            const pr = await getUsers(process.env.ADMIN_TOKEN)
            console.log(pr)
        });
        it ("Admin should add Install_rights to Alice, Bob, Charlie and Dan, but not to Mike", async function(){    
            // this.timeout(5000);
            const new_install_right_users = new Object()
            for (let ui=0; ui<5; ui++){
                let user = all_users[ui]
                if (user){
                    new_install_right_users[user] = {exceptions: 'None'}
                }
            }
            const pr = await installRightsForUsers(
                process.env.ADMIN_TOKEN,
                new_install_right_users)
            console.log(pr)
        });
        it ("Everyone should change their password", async function (){
            for (let i=0; i< all_users.length; i++){
                let new_password = UserPasswords[all_users[i]]
                const pr = await changePassword(all_users[i], init_token, new_password)
                console.log(pr)
            }
        })
    });
    describe("Submitting and running Tests on the Mocha server", async function(){
        let test_id = ''
        let solution_1_id = ''
        let solution_2_id = ''
        it("Charlie should submit Mocha Test", async function(){
            let mocha_test_submitter = charlie_name
            let mocha_script_string = fs.readFileSync("./test/auxilliary_scripts/mocha_script.js").toString()
            let mocha_script_hash = crypto
                    .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
                    .update(mocha_script_string)
                    .digest('hex')
            const test_id_20byte = crypto
                    .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
                    .update(mocha_script_hash + mocha_test_submitter)
                    .digest('hex')
            test_id = test_id_20byte.slice(0,32)
            const packages_required = {
                    'fs': '1.1.1'
                }
            const pass_fraction = 0.9 // Math.round(0.9 * parseInt(process.env.SCORE_FACTOR))
            const pr = await submitTest(
                    mocha_test_submitter,
                    UserPasswords[mocha_test_submitter],
                    mocha_script_string,
                    test_id,
                    pass_fraction,
                    packages_required,
                )
            console.log(pr)
        });
        it("Alice should submit Solution to that Test", async function(){
            let mocha_solution_submitter = alice_name
            let solution_script_string = fs.readFileSync("./test/auxilliary_scripts/solution_script.js").toString()
            let solution_script_hash = crypto
                    .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
                    .update(solution_script_string)
                    .digest('hex')
            const solution_1_id_20byte = crypto
                    .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
                    .update(solution_script_hash + mocha_solution_submitter)
                    .digest('hex')
            solution_1_id = solution_1_id_20byte.slice(0,32)
            const packages_required = {
                    'fs': '1.1.1'
                }
            const pr = await submitSolution(
                mocha_solution_submitter,
                UserPasswords[mocha_solution_submitter],
                solution_script_string,
                test_id,
                solution_1_id,
                packages_required)
            console.log(pr)
        });
        it("Bob should submit another Solution to that Test", async function(){
            let mocha_solution_submitter = bob_name
            let solution_script_string = fs.readFileSync("./test/auxilliary_scripts/solution_script.js").toString()
            let solution_script_hash = crypto
                    .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
                    .update(solution_script_string)
                    .digest('hex')
            const solution_2_id_20byte = crypto
                    .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
                    .update(solution_script_hash + mocha_solution_submitter)
                    .digest('hex')
            solution_2_id = solution_2_id_20byte.slice(0,32)
            const packages_required = {
                    'fs': '1.1.1'
                }
            const pr = await submitSolution(
                mocha_solution_submitter,
                UserPasswords[mocha_solution_submitter],
                solution_script_string,
                test_id,
                solution_2_id,
                packages_required)
            console.log(pr)
        });
        it("Charlie should run Bobs submission",async function(){
            let run_mocha_submitter = charlie_name
            const pr = await runSubmission(
                run_mocha_submitter,
                UserPasswords[run_mocha_submitter],
                solution_2_id)
            console.log(pr)
        })
    });
})
