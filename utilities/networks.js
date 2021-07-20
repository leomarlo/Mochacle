NETWORK_SPECS = {
  kovan: {
    name: "kovan",
    chain_id: 42
  },
  rinkeby: {
    name: "rinkeby",
    chain_id: 4
  },
  ropsten: {
    name: "ropsten",
    chain_id: 3
  }
}


function get_network_info(network_name) {
  const result = new Object();
  let contract_address_filename = './app/contracts/addresses/'
  let oracle_file = './app/contracts/oracles/'
  if (network_name=='kovan'){
    result.current_network = NETWORK_SPECS.kovan;
    result.provider_url = process.env.KOVAN_URL
    result.link_contract_address = process.env.LINK_CONTRACT_KOVAN
    contract_address_filename += 'TestOracle_kovan.txt'
    result.contract_address_filename = contract_address_filename
    oracle_file += 'on_kovan.json'
    result.oracle_file = oracle_file
  } else if (network_name=='rinkeby') {
    result.current_network = NETWORK_SPECS.rinkeby;
    result.provider_url = process.env.RINKEBY_URL
    result.link_contract_address = process.env.LINK_CONTRACT_RINKEBY
    contract_address_filename += 'TestOracle_rinkeby.txt'
    result.contract_address_filename = contract_address_filename
    oracle_file += 'on_rinkeby.json'
    result.oracle_file = oracle_file
  } else {  
    console.log('You must at this point choose either kovan or rinkeby!!')
  }
  return result
}

module.exports = {
    get_network_info
};