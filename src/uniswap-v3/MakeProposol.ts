import { Contract, ethers } from 'ethers'
import { namehash } from '@ethersproject/hash'
import { keccak256 } from '@ethersproject/keccak256'
import { Interface } from '@ethersproject/abi'
// note: contract ABIs should be imported via etherscan
import { GOVERNOR_BRAVO_ABI, ENS_REGISTRY_ABI, ENS_PUBLIC_RESOLVER_ABI } from './utils'

const GOVERNOR_BRAVO_ADDRESS: string = '0x408ED6354d4973f66138C91495F2f2FCbd8724C3'
const ENS_REGISTRY_ADDRESS: string = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
const PUBLIC_ENS_RESOLVER_ADDRESS: string = '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41'
const UNISWAP_GOVERNANCE_TIMELOCK_ADDRESS: string = '0x1a9C8182C09F50C8318d769245beA52c32BE35BC'

const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL_HERE')
const signer = provider.getSigner('YOUR_SIGNER_ADDRESS_HERE')

// note: setting the subnode record should only take place if the subdomain does not already exist
const ensRegistryInterface = new Interface(ENS_REGISTRY_ABI)
const setSubnodeRecordCalldata = ensRegistryInterface.encodeFunctionData('setSubnodeRecord', [
  // node: The parent node
  namehash('uniswap.eth'),
  // label: The hash of the label specifying the subnode
  keccak256('v3-core-license-grants'),
  // owner: The address of the new owner
  UNISWAP_GOVERNANCE_TIMELOCK_ADDRESS,
  // resolver: The address of the resolver
  PUBLIC_ENS_RESOLVER_ADDRESS,
  // ttl: The TTL, i.e., time to live, in seconds
  0,
])

const ensPublicResolverInterface = new Interface(ENS_PUBLIC_RESOLVER_ABI)
const setTextCalldata = ensPublicResolverInterface.encodeFunctionData('setText', [
  // node: The node to update
  namehash('v3-core-license-grants.uniswap.eth'),
  // key: The key to set
  '[your-projects-additional-use-grant-title]',
  // value: The text data value to set
  '[your-additional-use-grant-description]',
])

// Create a new local instance of the governorBravo contract
// Note that in production the abi should be gathered via etherscan
const governorBravo = new Contract(GOVERNOR_BRAVO_ADDRESS, GOVERNOR_BRAVO_ABI, provider)

// the ordered list of target addresses for calls to be made
const targets = [ENS_REGISTRY_ADDRESS, PUBLIC_ENS_RESOLVER_ADDRESS]

// The ordered list of values to be passed to the calls to be made. i.e., the amount of
// ETH values to be transferred within the transaction. as this example does not include
// the transferring of any ETH, this list is empty.
const values = [0, 0]

// The ordered list of function signatures to be called. The signatures arguments
// are optional, if not provided, the function signature will be inferred from the calldata
const signatures = ['', '']

// The ordered list of calldata to be passed to each call in the proposal. The calldata
// in this example takes the place of the function signature arguments.
const calldatas = [setSubnodeRecordCalldata, setTextCalldata]

// the description of the proposal.
const description = '# TITLE ## SECTION_EXPLANATION'

async function main() {
  try {
    const txResponse: ethers.providers.TransactionResponse = await governorBravo
      .connect(signer)
      .propose(targets, values, signatures, calldatas, description)
    console.log(`Proposal transaction sent: ${txResponse.hash}`)
    await txResponse.wait(1)
    console.log(
      `Proposal has been mined at blocknumber: ${txResponse.blockNumber}, transaction hash: ${txResponse.hash}`
    )
  } catch (error) {
    console.error(error)
  }
}

main().then(() => console.log('done'))