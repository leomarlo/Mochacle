const util = require('util');
const exec = require("child_process").exec; 
const exec_promise = util.promisify(exec);

async function runMocha (inside_docker) {   
    console.log("we are inside mocha execution")
    // exec_promise(`./create_github_repo.sh ${repo_name}`).then((value)=>{console.log(value)}).catch((err)=>{console.log(err)})
    // const { stdout, stderr } = await exec_promise(`mocha ./server/test.js --reporter json > ./scripts/result.json`);
    let result_string = ''
    let error_string = ''
    if (inside_docker) {
        let { stdout, stderr } = await exec_promise(`./node_modules/mocha/bin/mocha ./scripts/test.js --reporter json`);
        result_string = stdout
        error_string = stderr
    }
    else {
        // console.log(`mocha ./scripts/test.js --reporter json`)
        let { stdout, stderr } = await exec_promise(`mocha ./server/scripts/test.js --reporter json`)
        result_string = stdout
        error_string = stderr
    }
    console.log('stdout:', result_string);
    console.log('stderr:', error_string);
    result = JSON.parse(result_string);
    console.log(typeof(result))
    console.log(result.stats)
    return result;
};

module.exports = runMocha;