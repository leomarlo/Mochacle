
import {testFile, solutionFile} from './files'

function handleMochaSolutionFile(fileList, mocha_solution_file_display, upload_mocha_solution_btn, mocha_target_input) {
  if (fileList.length>0){
    const file = fileList[0]
    const fileSpecs = {
      name: file.name,
      size: file.size,
      type: file.type
    }
    mocha_solution_file_display.innerText = file.name
    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
      // when the reader is done, the content is in reader.result.
      const solution = {
        meta: fileSpecs,
        text: reader.result
      }
      const fitnessReport = fitsMochaSolutionCriteria(solution)
      if (fitnessReport.pass){
        solutionFile.meta = solution.meta
        solutionFile.text = solution.text
        console.log('congratulation! Fitness passed!')
      } else {
        alert(fitnessReport.message);
      }

      if (fitnessReport.pass && testTargetId(mocha_target_input.value)){
        upload_mocha_solution_btn.disabled = false
      } else {
        upload_mocha_solution_btn.disabled = true
      }

    };
    reader.readAsText(fileList[0])

  } else {
    console.log('No file specified')
  }
}
  


function fitsMochaTestCriteria(file_data){
  let pass = true
  let message = 'Your file does not satisfy basic criteria for a mocha test file!'
  if (file_data.meta.type.indexOf('javascript')<0){
    pass = false
    message += '\nIt should be a javascript file (file extension = ".js")'
  }
  const condition1 = file_data.text.indexOf('require("<<<submission>>>")')
  const condition2 = file_data.text.indexOf("require('<<<submission>>>')")
  if (!(condition1 || condition2)){
    pass = false
    message += '\nIt should require the solution functions via \'require("<<<submission>>>")\''
  }
  if (pass){
    message = 'The file passed the requirements!'
  }
  return {pass, message}
}


function fitsMochaSolutionCriteria(file_data){
  let pass = true
  let message = 'Your file does not satisfy basic criteria for a mocha solution file!'
  if (file_data.meta.type.indexOf('javascript')<0){
    pass = false
    message += '\nIt should be a javascript file (file extension = ".js")'
  }
  return {pass, message}

  // in principle it should also check whether all the methods are defined that are imported in the target script
}


function handleMochaTestFile(fileList, mocha_test_file_display, upload_mocha_test_btn) {
  if (fileList.length>0){
    const file = fileList[0]
    const fileSpecs = {
      name: file.name,
      size: file.size,
      type: file.type
    }
    mocha_test_file_display.innerText = file.name
    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
      // when the reader is done, the content is in reader.result.
      const test = {
        meta: fileSpecs,
        text: reader.result
      }
      const fitnessReport = fitsMochaTestCriteria(test)
      if (fitnessReport.pass){
        testFile.meta = test.meta
        testFile.text = test.text
        upload_mocha_test_btn.disabled = false
        console.log('congratulation')
      } else {
        upload_mocha_test_btn.disabled = true
        alert(fitnessReport.message);
      }
    };
    reader.readAsText(fileList[0])

  } else {
    console.log('No file specified')
  }
}


function testTargetId(target_id) {
  const condition_1 = target_id.length==32
  // const condition_2 = Only HEX decimal digits
  const condition = condition_1
  return condition
}


export {
  handleMochaSolutionFile,
  handleMochaTestFile
}