const util = require('util');
const exec = require("child_process").exec; 
const exec_promise = util.promisify(exec);
// require('dotenv').config({ path: `../.server.env` })

async function installPackages (packages) {
    console.log("we are inside package addition")
    // exec_promise(`./create_github_repo.sh ${repo_name}`).then((value)=>{console.log(value)}).catch((err)=>{console.log(err)})
    // const { stdout, stderr } = await exec_promise(`mocha ./server/test.js --reporter json > ./scripts/result.json`);
    const concatenated_packages = packages.join(' ')
    console.log(concatenated_packages)
    let { stdout, stderr } = await exec_promise(`npm i ${concatenated_packages}`);
    // result = JSON.parse(stdout);
    console.log(stderr)
    console.log(stdout)
    return stdout;
};

module.exports = installPackages;