// the backend server that orchestrates everything

// write an app that runs the mocha bash script
const express = require('express');
const runMocha = require('./scripts/mochaTest.js');
const installPackages = require('./scripts/installPackages.js');
const cors = require('cors');
const fs = require("fs");
const crypto = require('crypto');
require('dotenv').config({ path: './server/.server.env' })
//IMPORTANT!! CHANGE THE LOCATION OF THE .server.env path inside the docker environment!!!

// Constants
const PORT = 8080;
const INSIDE_DOCKER = process.env.INSIDE_DOCKER;
let HOST = ''
if (process.env.INSIDE_DOCKER) {
    HOST = '0.0.0.0';
}
else {
    HOST = 'localhost';
}
// App
const app = express();

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());

// RAM Database (must be replaced!!)
const solutionSubmissions = new Object()
const testSubmissions = new Object()
const passwordHashes = new Object() // THis really needs to go into db!!!
const blockedUsers = new Object()
const installRights = new Object()

passwordHashes[process.env.ADMIN_NAME] = crypto.createHash(process.env.HASH_FUNCTION.toString()).update(process.env.ADMIN_TOKEN).digest('hex')
installRights[process.env.ADMIN_NAME] = {exceptions: []}

app.get('/', (req, res) => {
  res.send('Welcome to the Testoracle API');
});

app.get('/submission_ids', (req, res) => {
  res.send(Object.keys(solutionSubmissions));
});

app.get('/target_ids', (req, res) => {
  res.send(Object.keys(testSubmissions));
});

app.get('/testResult/:submission_id', (req, res) => {
    res.send(solutionSubmissions[req.params.submission_id]);
  });

app.get('/testStatus/:target_id', (req, res) => {
  res.send(testSubmissions[req.params.target_id]);
});

app.post('/adminAddUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    for (let i=0; i<req.body.new_user.length; i++){
      if (req.body.new_user[i] in passwordHashes){
        continue;
      }
      passwordHashes[req.body.new_user[i]] = crypto.createHash(process.env.HASH_FUNCTION.toString()).update(process.env.INIT_TOKEN).digest('hex')
    }
    res.send('successfully updated new users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminAddInstallRightUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    const userList = Object.keys(req.body.install_right_users)
    // console.log(req.body.install_right_users)
    for (let i=0; i<userList.length; i++){
      if (userList[i] in installRights){
        continue;
      }
      installRights[userList[i]] = {'exceptions':req.body.install_right_users[userList[i]].exceptions}
    }
    res.send('successfully updated install rights for these users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminBlockUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    for (let i=0; i<req.body.block_these_users.length; i++){
      blockedUsers[req.body.block_these_users[i]] = {duration: 'until further notice'}
    }
    res.send('successfully blocked users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminUnblockUsers', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    for (let i=0; i<req.body.unblock_these_users.length; i++){
      delete blockedUsers[req.body.unblock_these_users[i]]
    }
    res.send('successfully blocked users')
  } 
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminGetUsersList', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    const allUsers = Object.keys(passwordHashes)
    const returnUsers = new Array(allUsers.length)
    for(let i=0; i<allUsers.length; i++){
      let password_reset = false
      if (allUsers[i]==process.env.ADMIN_NAME){
        password_reset = passwordHashes[allUsers[i]] != crypto.createHash(process.env.HASH_FUNCTION.toString()).update(process.env.ADMIN_TOKEN).digest('hex')
      } else {
        password_reset = passwordHashes[allUsers[i]] != crypto.createHash(process.env.HASH_FUNCTION.toString()).update(process.env.INIT_TOKEN).digest('hex')
      }
      returnUsers[i] = {
        name: allUsers[i],
        blocked: allUsers[i] in blockedUsers,
        password_reset: password_reset,
        install_rights: allUsers[i] in installRights,
      }
    }
    res.send(returnUsers)
  } 
  else{
    res.send('wrong token, sorry')
  }
})


app.post('/changePassword', async (req, res) => {
  if (passwordHashes[req.body.name.toString()] == crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token.toString()).digest('hex')){
    passwordHashes[req.body.name] = crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.new_token).digest('hex')
    res.send(`successfully changed password of ${req.body.name}`)
  }
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/adminInstallPackages', async (req, res) => {
  if (crypto.createHash(process.env.HASH_FUNCTION.toString()).update(req.body.token).digest('hex') == passwordHashes[process.env.ADMIN_NAME]){
    const result = await installPackages(req.body.packages)
    console.log(`successfully added packages`)
    res.send(result)
  }
  else{
    res.send('wrong token, sorry')
  }
})

app.post('/InstallPackages', async (req, res) => {
  
  if (!_mayInstallPackages(req.body.name, req.body.token)){
    res.send('Sorry, you may not install packages :( Ask one of the admins to add you!')
  } else {
    const result = await installPackages(req.body.packages)
    console.log(`successfully added packages`)
    res.send(result)
  }
})


app.post('/testSubmission', async (req, res) => {
  // only users:
  if (!_passTokenTest(req.body.name, req.body.token)){
    res.send('Wrong Password!')
  } else {
    // if this target_id exists, you may overwrite it if you're the submitter
    let revert = false
    if (req.body.target_id in testSubmissions){
      if (testSubmissions[req.body.target_id].name == req.body.name){
        console.log('You are overwriting this existing entry!')
      }
      else{
        console.log('You are not allowed to overwrite this existing entry, since you are not the owner!')
        revert = true
      }
    }
    // should we revert?
    if (revert){
      res.send('Overwriting is not permitted for this User!')
    }
    else {
      // submit target testfile
      let template_filename = `target_${req.body.target_id}.js`
      // write the file with the testjs parameter
      let path_to_server = './' + (process.env.INSIDE_DOCKER ? '': process.env.SERVER_PATH)
      let path_to_scripts = path_to_server + process.env.SCRIPTS_PATH
      const ret_promise = fs.writeFileSync(path_to_scripts + template_filename, req.body.targettemplatejs)
      testSubmissions[req.body.target_id] = {
        target_id: req.body.target_id,
        name: req.body.submitter,
        targettemplatejs: req.body.targettemplatejs,
        packages_required:req.body.packages_required,
        packages_installed: new Object(),
        status: 'uploaded',
        pass_fraction: req.body.pass_fraction,
        submissions: new Object(),
        template_filename: template_filename
      }
      // what are the remaining required packages?
      const packages_installed_from_required = await _installRemainingPackages(
        req.body.name,
        req.body.token,
        req.body.packages_required
      )
      // fill the packages_install filed
      testSubmissions[req.body.target_id].packages_installed = packages_installed_from_required
      res.send(testSubmissions);
    }
    
  }
})

// submit a solution
app.post('/solutionSubmission', async (req, res) => {
  // only users:
  if (!_passTokenTest(req.body.name, req.body.token)){res.send('Wrong Password!')}
  else {
    // if this target_id exists, you may overwrite it if you're the submitter
    let revert = false
    if (req.body.target_id in solutionSubmissions){
      if (solutionSubmissions[req.body.submission_id].name == req.body.name){
        console.log('You are overwriting this existing entry!')
      }
      else{
        console.log('You are not allowed to overwrite this existing entry, since you are not the owner!')
        revert = true
      }
    }

    // should we revert?
    if (revert){
      res.send('Overwriting is not permitted for this User!')
    }
    else {
      // solution file will go into the scripts folder,
      // whose name depends on whether the app runs inside docker or not

      const submission_filename = `target_${req.body.target_id}_id_${req.body.submission_id}_submission.js`
      const test_filename = `target_${req.body.target_id}_id_${req.body.submission_id}_test.js`

      // console.log(testSubmissions[req.body.target_id.toString()])
      const test_template_filename = testSubmissions[req.body.target_id].template_filename
      // write the file with the submissionjs parameter
      const path_to_server = './' + (process.env.INSIDE_DOCKER ? '': process.env.SERVER_PATH)
      const path_to_scripts = path_to_server + process.env.SCRIPTS_PATH
      const ret_promise = fs.writeFileSync(path_to_scripts + submission_filename, req.body.submissionjs)

      
      solutionSubmissions[req.body.submission_id] = {
        id: req.body.submission_id,
        target_id: req.body.target_id,
        name: req.body.submitter,
        testjs: req.body.submissionjs,
        packages_required:req.body.packages_required,
        packages_installed: new Object(),
        status: 'submitted',
        result: 'no result yet',
        score: -1,
        pass: -1,
        award: 0,
        place: 0,
        submission_filename: submission_filename,
        test_filename: test_filename,
        test_template_filename: test_template_filename,
      }
      // what are the remaining required packages?
      const packages_installed_from_required = await _installRemainingPackages(
        req.body.name,
        req.body.token,
        req.body.packages_required
      )
      console.log('packages_installed_from_required', packages_installed_from_required)
      // fill the packages_install filed
      solutionSubmissions[req.body.submission_id].packages_installed = packages_installed_from_required

      // now also create a test script from the submitted target template
      const read_promise = fs.readFileSync(path_to_scripts + test_template_filename)
      let template = read_promise.toString();
      let test_file_string = template.replace('<<<submission>>>', `./${submission_filename}`)
      const write_promise = fs.writeFileSync(path_to_scripts + test_filename, test_file_string)
      // update testSubmissions
      testSubmissions[req.body.target_id].status = 'has submissions'
      testSubmissions[req.body.target_id].submissions[req.body.submission_id] = {
        submission_id: req.body.submission_id,
        score: solutionSubmissions[req.body.submission_id].score,
        pass: solutionSubmissions[req.body.submission_id].pass,
        award: solutionSubmissions[req.body.submission_id].award,
        place: solutionSubmissions[req.body.submission_id].place
      } // should be joined with solutionSubmission

      res.send(solutionSubmissions);
    }
  }
});

app.post('/runSubmission', async (req, res) => {
  // only users:
  if (!_passTokenTest(req.body.name, req.body.token)){res.send('Wrong Password!')}
  else {
    const test_filename = solutionSubmissions[req.body.submission_id].test_filename
    const path_to_server = './' + (process.env.INSIDE_DOCKER ? '': process.env.SERVER_PATH)
    const path_to_test = path_to_server + process.env.SCRIPTS_PATH
    const result = await runMocha(path_to_test, test_filename)
    solutionSubmissions[req.body.submission_id].status = 'has been run'
    solutionSubmissions[req.body.submission_id].result = result
    const score = summary(result)
    const target_id = solutionSubmissions[req.body.submission_id].target_id
    const pass = (score >= testSubmissions[target_id].pass_fraction ? 1: 0)
    solutionSubmissions[req.body.submission_id].score = score
    solutionSubmissions[req.body.submission_id].pass = pass
    solutionSubmissions[req.body.submission_id].place = getPlace()
    solutionSubmissions[req.body.submission_id].award = getAward()
    // update also testSubmissions
    const testSubmission = testSubmissions[target_id].submissions[req.body.submission_id]
    if (testSubmission) {
      testSubmission.score = solutionSubmissions[req.body.submission_id].score
      testSubmission.pass = solutionSubmissions[req.body.submission_id].pass
      testSubmission.place = solutionSubmissions[req.body.submission_id].place
      testSubmission.award = solutionSubmissions[req.body.submission_id].award
    }
    else {
      console.log("sorry, no submission with this submission id")
    }

    testSubmissions[target_id].status = getStatusForTestSubmission(pass)
    solutionSubmissions[req.body.submission_id].status = getStatusForSolutionSubmission(pass)

    res.send(solutionSubmissions);
  }
});


function _passTokenTest(name,token) {
  const condition_token = passwordHashes[name] == crypto.createHash(process.env.HASH_FUNCTION.toString()).update(token).digest('hex')
  const condition_blocked = name in blockedUsers
  return (condition_token && !condition_blocked)
}

function _mayInstallPackages(name,token) {
  const condition_access = _passTokenTest(name,token)
  const condition_install_rights = name in installRights
  return (condition_access && condition_install_rights)
}

function summary(result) {
  return result.stats.passes/result.stats.tests
}


function getAward(){
  return 0
}


function getPlace(){
  return 0
}


function getStatusForTestSubmission(pass) {
  if (pass){
    return 'has been solved'
  } else {
    return 'not yet solved'
  }
}


function getStatusForSolutionSubmission(pass) {
  if (pass){
    return 'successful'
  } else {
    return 'unsuccessful'
  }
}



function _is_package_installed(package_name) {
  try {
    return (
      process.moduleLoadList.indexOf("NativeModule " + package_name) >= 0 ||
      fs.existsSync(require.resolve(package_name))
    );
  } catch (e) {
    return false;
  }
}

async function _installRemainingPackages(name, token, packages_required) {
    const required_list = Object.keys(packages_required)
    let packages_installed_from_required = new Object()
    const packages_not_installed_from_required = new Array()
    for (j=0; j<required_list.length; j++){
      const package_name = required_list[j]
      const install_flag = _is_package_installed(package_name)
      if (install_flag){
        console.log(package_name + " is present")
        packages_installed_from_required[package_name] = {
          "installed_version": 'NA',
          "required_version": packages_required[package_name]
        }
      } else {
        // package needs to be installed

        console.log(package_name + " is not present")
        packages_not_installed_from_required.push(package_name)
        // const result = await installPackages(req.body.packages)
      }
    }

    // install required packages if possible
    console.log('packages_not_installed_from_required', packages_not_installed_from_required)
    if (packages_not_installed_from_required.length!=0){
      console.log("We need to install some remaining required packages")
      if (_mayInstallPackages(name, token)){
        for (let pic=0; pic<packages_not_installed_from_required.length; pic++){
          let n_package_name = packages_not_installed_from_required[pic]
          const result = await installPackages([n_package_name])
          console.log(result)
        }
        
        // check which packages are now installed
        for (let pic=0; pic<packages_not_installed_from_required.length; pic++){
          let n_package_name = packages_not_installed_from_required[pic]
          const install_flag = _is_package_installed(n_package_name)
          console.log(n_package_name + ".", "Install_flag:", install_flag)
          if (install_flag){
            packages_installed_from_required[n_package_name] = {
              "installed_version": 'NA',
              "required_version": packages_required[n_package_name]
            }
          }
        }

      } else {
        console.log('you do not have the rights to install the missing packages. contact one of the admins!')
      }


    } else {
      console.log('all required packages are already installed!')
    }

    return packages_installed_from_required
}
  

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);




