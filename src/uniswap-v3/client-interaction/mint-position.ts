import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import {
  MintOptions,
  nearestUsableTick,
  NonfungiblePositionManager,
  Pool,
  Position,
} from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  NONFUNGIBLE_POSITION_MANAGER_ABI,
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
  USDC_TOKEN, DAI_TOKEN
} from './constants.ts';
import { getPoolInfo } from './pool.ts'

interface PositionInfo {
  tickLower: number
  tickUpper: number
  liquidity: BigInt
  feeGrowthInside0LastX128: BigInt
  feeGrowthInside1LastX128: BigInt
  tokensOwed0: BigInt
  tokensOwed1: BigInt
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

async function mintPosition() {

  if (!signer) {
    return "Failed"
  }

  // Give approval to the contract to transfer tokens
  await getTokenTransferApproval(USDC_TOKEN)
  await getTokenTransferApproval(DAI_TOKEN)

  const positionToMint = await constructPosition(
    CurrencyAmount.fromRawAmount(
      USDC_TOKEN,
      TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER
    ),
    CurrencyAmount.fromRawAmount(
      DAI_TOKEN,
      TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER
    )
  )

  const mintOptions: MintOptions = {
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    slippageTolerance: new Percent(50, 10_000),
  }

  // get calldata for minting a position
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    positionToMint,
    mintOptions
  )

  // build transaction
  const transaction = {
    data: calldata,
    to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    value: value,
    from: signer.address,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  }

  return await new ethers.WebSocketProvider(window?.ethereum, 'any').send(
    'eth_sendTransaction',
    [transaction]
  )
}

export async function constructPosition(
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>
): Promise<Position> {
  // get pool info
  const poolInfo = await getPoolInfo()

  // construct pool instance
  const configuredPool = new Pool(
    token0Amount.currency,
    token1Amount.currency,
    poolInfo.fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  )

  // create position using the maximum liquidity from input amounts
  return Position.fromAmounts({
    pool: configuredPool,
    tickLower:
      nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) -
      poolInfo.tickSpacing * 2,
    tickUpper:
      nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) +
      poolInfo.tickSpacing * 2,
    amount0: token0Amount.quotient,
    amount1: token1Amount.quotient,
    useFullPrecision: true,
  })
}

async function getPositionIds(): Promise<number[]> {
  if (!signer) {
    throw new Error('No signer available')
  }

  const positionContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    signer
  )

  // Get number of positions
  const balance: number = await positionContract.balanceOf(signer.address)

  // Get all positions
  const tokenIds = []
  for (let i = 0; i < balance; i++) {
    const tokenOfOwnerByIndex = await positionContract.tokenOfOwnerByIndex(signer.address, i);
    tokenIds.push(tokenOfOwnerByIndex);
  }

  return tokenIds
}

async function getPositionInfo(tokenId: number): Promise<PositionInfo> {
  if (!signer) {
    throw new Error('No signer available')
  }

  const positionContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    signer
  )

  const position = await positionContract.positions(tokenId)

  return {
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    liquidity: position.liquidity,
    feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
    feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
    tokensOwed0: position.tokensOwed0,
    tokensOwed1: position.tokensOwed1,
  }
}

export async function getTokenTransferApproval(
  token: Token
): Promise<String> {
  if (!signer) {
    console.log('No signer Found')
    return "Failed";
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      signer
    )

    const transaction = await tokenContract.approve(
      NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER
    )
    
    return transaction;
  } catch (e) {
    console.error(e)
    return "Failed";
  }
}

