import { ethers } from 'ethers'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { POOL_FACTORY_CONTRACT_ADDRESS, USDC_TOKEN, DAI_TOKEN } from './constants.ts'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'

interface PoolInfo {
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  sqrtPriceX96: ethers.BigNumberish
  liquidity: ethers.BigNumberish
  tick: number
}

async function connectToMetaMask() {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.WebSocketProvider(window.ethereum);
            const signer = provider.getSigner();
            return signer;
        } catch (error) {
            console.error("User denied account access", error);
        }
    } else {
        console.error("MetaMask is not installed!");
    }
}

const signer = await connectToMetaMask();

export async function getPoolInfo(): Promise<PoolInfo> {
  if (!signer) {
    throw new Error('No provider')
  }

  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: USDC_TOKEN,
    tokenB: DAI_TOKEN,
    fee: FeeAmount.LOW,
  })

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    signer
  )

  const [token0, token1, fee, tickSpacing, liquidity, slot0] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ])

  return {
    token0,
    token1,
    fee,
    tickSpacing,
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  }
}
