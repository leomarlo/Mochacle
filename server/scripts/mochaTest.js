const util = require('util');
const exec = require("child_process").exec; 
const exec_promise = util.promisify(exec);
require('dotenv').config({ path: `../.server.env` })

async function runMocha (path_to_test, test_filename) {
    console.log("we are inside mocha execution")
    // exec_promise(`./create_github_repo.sh ${repo_name}`).then((value)=>{console.log(value)}).catch((err)=>{console.log(err)})
    // const { stdout, stderr } = await exec_promise(`mocha ./server/test.js --reporter json > ./scripts/result.json`);
    let result_string = ''
    let stderr_string = ''
    let error_message = ''
    let success = true 
    const path_and_filename = path_to_test + test_filename
    if (process.env.INSIDE_DOCKER) {
        try{
            let { stdout, stderr, err } = await exec_promise(`./node_modules/mocha/bin/mocha ${path_and_filename} --reporter json || echo`);
            result_string = stdout
            stderr_string = stderr
            error_message = err.toString()
            console.log('error within the the execution of the mocha script:', err.toString())
        } catch (error) {
            success = false
            error_message = error.toString()
            // return error.toString()  //JSON.parse(error)
        }
    }
    else {
        try {
            let { stdout, stderr, err } = await exec_promise(`mocha ${path_and_filename} --reporter json || echo`)
            result_string = stdout
            stderr_string = stderr
            error_message = err.toString()
            console.log('error within the the execution of the mocha script:', err.toString())
        } catch (error) {
            success = false
            error_message = error.toString()
            // return error.toString()  //JSON.parse(error)
        }
    }
    result = JSON.parse(result_string);
    return {
        result,
        success,
        stderr_string,
        error_message
    };
};

module.exports = runMocha;