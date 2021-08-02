import axios from 'axios'
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('javascript', javascript);
import dotenv from 'dotenv'
dotenv.config()

const reward_solution_btn = document.getElementById("submit-reward-btn")

async function displayMySolutionIds(address, ticket_div, solution_reward_input) {
    ticket_div.innerHTML = ''
    solution_reward_input.value = ''
  
    const tile_contents = new Array()
    try {
      let base_url = process.env.SERVERHOST_DOCKER_REMOTE + '/users/' + address;
      const res = await axios.get(base_url)
      const targets = res.data.test_submissions;
      // const submissionids = new Object()
  
      for (let i=0; i<targets.length; i++){
        let this_target_url = process.env.SERVERHOST_DOCKER_REMOTE + '/target_ids/' + targets[i]
        let respo = await axios.get(this_target_url)
        let solutions = new Array()
        for (const [id, properties] of Object.entries(respo.data.submissions)){
          solutions.push({
            id: id,
            text: id,
            dom_id: "paste-solution-" + id,
            score: properties.score,
            bootstrap_color: getColorFromSolutionProperties(properties),
            pass: properties.pass
          })
        }
        let this_content = {
          solutions: solutions,
          id: "solution-for-" + targets[i],
          bootstrap_color: getColorFromSolutions(solutions),
          header: "Solutions for test:\n" + targets[i],
          target_id: targets[i]
        }
  
        tile_contents.push(this_content)
      }
    } catch (err) {
      console.log(err)
    }
  
    for (let k=0; k<tile_contents.length; k++) {
  
      addSolutionsTile(tile_contents[k], ticket_div)
      let sols = tile_contents[k].solutions
      for (let m=0; m<sols.length; m++) {
        let solution_link = document.getElementById(sols[m].dom_id)
        solution_link.addEventListener('click', () => {
          if (solution_reward_input.value==sols[m].id){
            solution_reward_input.value = ''
            reward_solution_btn.disabled = true 
          } else {
            solution_reward_input.value = sols[m].id
            reward_solution_btn.disabled = false
          }
        })
      }
      
    }
  }



async function displayMochaTest(ticket_div, mocha_target_input, mocha_solution_file_display){
  // get all the target_ids from axios call
  ticket_div.innerHTML = ''
  mocha_target_input.value = ''
  try{
    let ticket_divs = new Array()
    let base_url = process.env.SERVERHOST_DOCKER_REMOTE + '/target_ids'
    const res = await axios.get(base_url)
    // console.log(res.data)
    for (let j=0; j<res.data.length; j++){
      try{
        let target_url = base_url + '/' + res.data[j].id
        const target_response = await axios.get(target_url)
        // console.log(target_response.data)
          
        const tile_content = new Object()
        tile_content.title = res.data[j].id
        tile_content.id = res.data[j].id
        tile_content.button_name = 'target-btn-' + res.data[j].id
        tile_content.submitter = target_response.data.name
        tile_content.mocha_script = target_response.data.targettemplatejs
        tile_content.url = target_url
        tile_content.status = res.data[j].status
        if (res.data[j].status=="uploaded"){
          tile_content.bootstrap_color = 'success'
          tile_content.header = 'Waiting for submissions'
        } else if (res.data[j].status=="has been solved") {
          tile_content.bootstrap_color = 'danger'
          tile_content.header = 'Has been passed!'
        } else if (res.data[j].status=="has submissions") {
          tile_content.bootstrap_color = 'warning'
          tile_content.header = 'Has submissions, but none passed!'
        } else {
          tile_content.bootstrap_color = 'default'
          tile_content.header = 'Status unclear!'
        }
        tile_content.link_text = `Link to the submission information`  
        ticket_divs.push({
          id: res.data[j].id,
          tile_content: tile_content
        })
      } catch (err_target) {
        console.log(err_target)
      }
    }

    for (let k=0; k<ticket_divs.length; k++){
      if (ticket_divs[k].tile_content.status=="has been solved"){
        continue;
      }
      addMochaTestTile(ticket_divs[k].tile_content, ticket_div)
      const tile_button = document.getElementById(ticket_divs[k].tile_content.button_name)
      tile_button.addEventListener('click', ()=>{
        if (mocha_target_input.value==ticket_divs[k].id){
          mocha_target_input.value = ''
        } else {
          mocha_target_input.value = ticket_divs[k].id
          // reset the selected file to zero
          mocha_solution_file_display.innerText = '...'
        }
      })
    }

  } catch (err) {
    console.log(err)
  } 
}
  


function addSolutionsTile(tile_content, ticket_div){
  const card = document.createElement("div")
  card.setAttribute("id", "card-" + tile_content.id);
  card.setAttribute("class", "card border border-3");
  card.setAttribute("style", "width: 100%; margin-bottom:4%");

  const card_header = document.createElement("div")
  card_header.setAttribute("class", "card-header bg-" + tile_content.bootstrap_color)

  const card_body = document.createElement("div")
  card_body.setAttribute("style", "text-align:left; padding:5px;margin-bottom:0%")

  if (tile_content.solutions.length==0) {

    const card_title = document.createElement("h5")
    card_title.setAttribute("class", "card-title ml-4");
    let card_title_text = document.createTextNode("No submissions for this test, yet!")
    card_title.appendChild(card_title_text)


    card_body.appendChild(card_title)

  } else {
    const ul_el = document.createElement("ul");
    ul_el.setAttribute("class", "list-group list-group-flush");

    for (let j=0; j<tile_content.solutions.length; j++){
      let li_el = document.createElement("li");
      let li_el_class_attriutes = "list-group-item"
      li_el_class_attriutes += " bg-" + tile_content.solutions[j].bootstrap_color
      li_el_class_attriutes += " border border-dark rounded mb-1 ml-4 mr-6"
      li_el.setAttribute("id", tile_content.solutions[j].dom_id);
      li_el.setAttribute("class", li_el_class_attriutes);
      li_el.setAttribute("style", "cursor: pointer;") //"  padding:5px; margin-bottom:0%;")

      // li_el_link.setAttribute("href", tile_content.solutions[j].url)
      // li_el_link.setAttribute("class", "card-link")
      const li_text = document.createTextNode(tile_content.solutions[j].id);
      // li_el_link.appendChild(li_text)
      // li_el.appendChild(li_el_link)
      li_el.appendChild(li_text)
      ul_el.appendChild(li_el)
      
    }
    // if (tile_content.solutions.length==0) {
    //   li_el.appendChild(li_el_link)
    // }
    const card_title = document.createElement("h5")
    card_title.setAttribute("class", "card-title ml-4");
    let card_title_text = document.createTextNode("All submissions:")
    card_title.appendChild(card_title_text)

    card_body.appendChild(card_title)
    card_body.appendChild(ul_el)

  }
  
  const card_header_text = document.createTextNode(tile_content.header)
  card_header.appendChild(card_header_text)
  card.appendChild(card_header)


  card.appendChild(card_body)

  ticket_div.appendChild(card);

}








function addMochaTestTile(tile_content, ticket_div){

  const card = document.createElement("div");
  card.setAttribute("id", "card-" + tile_content.id);
  card.setAttribute("class", "card");
  card.setAttribute("style", "width: 100%; margin-bottom:4%");

  const card_header = document.createElement("div")
  card_header.setAttribute("class", "card-header bg-" + tile_content.bootstrap_color)

  const card_body = document.createElement("div")
  card_body.setAttribute("style", "text-align:left; padding:5px;margin-bottom:0%")

  const card_title = document.createElement("h5")
  card_title.setAttribute("class", "card-title");

  const card_submitter = document.createElement("div")
  card_submitter.setAttribute("style", "width:100%");

  const card_id = document.createElement("div")
  card_id.setAttribute("style", "width:100%");

  const card_footer = document.createElement("div")
  card_footer.setAttribute("style", "cursor: pointer; text-align:left; padding:5px; margin-bottom:0%;")
  card_footer.setAttribute("class", "card-footer")
  card_footer.setAttribute("id", tile_content.button_name);

  // const card_button = document.createElement("button")
  // card_button.setAttribute("type", "button");
  // card_button.setAttribute("id", tile_content.button_name);
  // card_button.setAttribute("class", "btn");
  // card_button.setAttribute("style", "background-color:#e7e7e7;");

  const card_script_details = document.createElement("details")
  const card_script_summary = document.createElement("summary")
  const card_script_content = document.createElement("div")
  card_script_content.setAttribute("style", "display:block; padding:5px; background-color:#e7e7e7;")

  const card_link = document.createElement("a")
  card_link.setAttribute("href", tile_content.url)
  card_link.setAttribute("class", "card-link")

  const card_header_text = document.createTextNode(tile_content.header)
  const card_title_text = document.createTextNode(tile_content.title)
  const card_submitter_text = document.createTextNode("submitter: " + tile_content.submitter)
  const card_id_text = document.createTextNode("target_id: " + tile_content.id)
  // const card_button_text = document.createTextNode("Select this mocha script")
  const card_script_summary_text = document.createTextNode("Show submitted target mocha script")
  // const mocha_script_highlighted = hljs.highlight(tile_content.mocha_script, {language: 'javascript'}).value
  const all_lines = tile_content.mocha_script.split('\n')
  const mocha_script_highlighted = all_lines.map((a)=>{return "<div>" + hljs.highlight(a, {language: 'javascript'}).value + "</div>"}).join("")

  console.log(tile_content.mocha_script)
  // console.log(mocha_script_highlighted)
  // const card_script_content_text = document.createTextNode(mocha_script_highlighted)
  const card_link_text = document.createTextNode(tile_content.url)
  const card_footer_text = document.createTextNode("Click here to select this mocha script")

  card_header.appendChild(card_header_text)
  card.appendChild(card_header)

  // append card title to the card body
  card_title.appendChild(card_title_text)
  card_body.appendChild(card_title)

  // append card_submitter paragraph to the card body
  card_submitter.appendChild(card_submitter_text)
  card_body.appendChild(card_submitter)

  // append card_id paragraph to the card body
  card_id.appendChild(card_id_text)
  card_body.appendChild(card_id)

  // append card_button to the card body
  // card_button.appendChild(card_button_text)
  // card_body.appendChild(card_button)

  card_script_summary.appendChild(card_script_summary_text)
  card_script_details.appendChild(card_script_summary)
  // card_script_content.appendChild(card_script_content_text)
  card_script_content.innerHTML = mocha_script_highlighted
  card_script_details.appendChild(card_script_content)
  card_body.appendChild(card_script_details)

  card_link.appendChild(card_link_text)
  card_body.appendChild(card_link)

  card.appendChild(card_body)

  card_footer.appendChild(card_footer_text)
  card.appendChild(card_footer)

  ticket_div.appendChild(card);
}



function getColorFromSolutionProperties(properties){
  if (properties.pass==-1) {
      return "warning"
  } else if (properties.pass==0){
      return "danger"
  } else if (properties.pass==1){
      return "success"
  } else {
      return "secondary"
  }
}

function getColorFromSolutions(solutions) {
  if (solutions.length>0){
    return "secondary"
  } else {
    return "secondary"
  }
}


export {
  displayMySolutionIds,
  displayMochaTest
}
  