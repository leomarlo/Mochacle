const util = require('util');
const exec = require("child_process").exec; 
const exec_promise = util.promisify(exec);
require('dotenv').config({ path: `../.server.env` })

async function runMocha (path_to_test, test_filename) {
    console.log("we are inside mocha execution")
    // exec_promise(`./create_github_repo.sh ${repo_name}`).then((value)=>{console.log(value)}).catch((err)=>{console.log(err)})
    // const { stdout, stderr } = await exec_promise(`mocha ./server/test.js --reporter json > ./scripts/result.json`);
    let result_string = ''
    let error_string = ''
    const path_and_filename = path_to_test + test_filename
    if (process.env.INSIDE_DOCKER) {
        try{
            let { stdout, stderr } = await exec_promise(`./node_modules/mocha/bin/mocha ${path_and_filename} --reporter json || echo`);
            result_string = stdout
            error_string = stderr
        } catch (error) {
            return error  //JSON.parse(error)
        }
    }
    else {
        try {
            let { stdout, stderr } = await exec_promise(`mocha ${path_and_filename} --reporter json || echo`)
            result_string = stdout
            error_string = stderr
        } catch (error) {
            return error  //JSON.parse(error)
        }
    }
    result = JSON.parse(result_string);
    return result;
};

module.exports = runMocha;