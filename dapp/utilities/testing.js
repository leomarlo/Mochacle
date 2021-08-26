import {CCC} from './files'

function test() {
    CCC.number = 4
    // console.log('CCC',CCC)
    let rew_label = CCC.rew_btn.innerHTML
    console.log(rew_label)
}

export {
    test
}