import { ethers } from 'ethers'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json' assert { type: "json" };
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json' assert { type: "json" };
require('dotenv').config();

const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

const WETH_TOKEN = new Token(
  1,    // chainId
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  18,
  'WETH',
  'Wrapped Ether'
)
const USDC_TOKEN = new Token(
  1,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  6,
  'USDC',
  'USD//C'
)

const amountIn = 1000;

function getProvider(): ethers.InfuraProvider {
  return new ethers.InfuraProvider('mainnet', process.env.INFURA_RPC_URL, process.env.INFURA_SECRET_KEY);
}

async function quote(): Promise<string> {
  const quoterContract = new ethers.Contract(
    QUOTER_CONTRACT_ADDRESS,
    Quoter.abi,
    getProvider()
  )
  const poolConstants = await getPoolConstants()

  const quotedAmountOut = await quoterContract.quoteExactInputSingle(
    poolConstants.token0,
    poolConstants.token1,
    poolConstants.fee,
    ethers.parseUnits(amountIn.toString(), 18).toString(),
    0
  )

  return ethers.formatUnits(quotedAmountOut, 6).slice(0, 4).toString();
}

async function getPoolConstants(): Promise<{
  token0: string
  token1: string
  fee: number
}> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: WETH_TOKEN,
    tokenB: USDC_TOKEN,
    fee: FeeAmount.MEDIUM,
  })

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    getProvider()
  )

  const [token0, token1, fee] = [await poolContract.token0(), await poolContract.token1(), await poolContract.fee()]

  return { token0, token1, fee }
}

console.log(await quote());

// anvil --fork-url https://mainnet.chainnodes.org/cb57fe1a-74ff-4adc-ab46-b3cbb96ce0ce --fork-block-number 17480237 --fork-chain-id 1 --chain-id 1   => run the loacl node with mainnet setup

// https://docs.uniswap.org/sdk/v3/guides/web3-development-basics => for local development(client side)