#!/usr/bin/env ts-node

import { Log, env } from 'decentraland-commons'
import { contracts, eth } from 'decentraland-eth'
import { db } from '../src/database'
import { Token, TokenAttributes } from '../src/Token'
import { Account, AccountAttributes } from '../src/Account'
import { loadEnv } from './utils'
import { Poll } from '../src/Poll'

const log = new Log('monitor')

type BigNumber = {
  toString(): string
  toNumber(): number
}
interface ERC20Token extends contracts.ERC20Token {
  balanceOf(address: string): Promise<BigNumber>
}
interface TokenContracts {
  [contractAddress: string]: ERC20Token
}

const tokenContracts: TokenContracts = {}

export async function main() {
  log.info('Connecting database')
  await db.connect()

  const tokens = await Token.find<TokenAttributes>()

  for (const token of tokens) {
    const tokenContract = Object.create(new contracts.ERC20Token(token.address))
    tokenContract.getContractName = () => token.name
    tokenContracts[token.address] = tokenContract
  }

  try {
    log.info(`Connecting to Ethereum Node with ${tokens.map(t => t.name)}`)
    await eth.connect({
      contracts: Object.values(tokenContracts),
      provider: env.get('RPC_URL')
    })

    const delay = env.get('MONITOR_BALANCES_DELAY', '5000')
    log.info(`Using ${delay}ms as delay between updates`)
    await monitorBalances(Number(delay))
  } catch (error) {
    log.info('Whoops, something went wrong')
    log.info(error)
  }

  process.exit()
}

async function monitorBalances(delay: number) {
  log.info('Updating Account balances')
  await updateAccountBalances()

  log.info('Updating Poll balances')
  await Poll.updateBalances()

  setTimeout(() => monitorBalances(delay), delay)
}

async function updateAccountBalances() {
  const accounts = await Account.find<AccountAttributes>()

  for (const account of accounts) {
    const { address, token_address } = account
    const contract = tokenContracts[token_address]
    if (!contract) {
      log.info(`No contract for address ${token_address} in account ${address}`)
      continue
    }

    const contractBalance = await contract.balanceOf(address)
    const balance = eth.utils.fromWei(contractBalance).toString()

    account.balance = balance
    log.info(`Updating Account ${account.address} with balance ${balance}`)

    await Account.update<AccountAttributes>(
      { balance: account.balance },
      { address, token_address }
    )
  }
}

if (require.main === module) {
  loadEnv()
  main()
}