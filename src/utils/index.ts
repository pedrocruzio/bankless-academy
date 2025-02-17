/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
import { Contract } from '@ethersproject/contracts'
import { getAddress } from '@ethersproject/address'
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { NetworkConnector } from '@web3-react/network-connector'
import * as ethUtil from 'ethereumjs-util'
import { ethers } from 'ethers'
import { verifyTypedData } from 'ethers/lib/utils'
import { Network } from '@ethersproject/networks'
import queryString from 'query-string'
import mixpanel, { Dict, Query } from 'mixpanel-browser'

import {
  ACTIVATE_MIXPANEL,
  ALCHEMY_KEY,
  DOMAIN_PROD,
  INFURA_KEY,
  MIRROR_ARTICLE_ADDRESSES,
} from 'constants/index'
import { NETWORKS, SUPPORTED_NETWORKS_IDS, RPCS } from 'constants/networks'
import axios, { AxiosResponse } from 'axios'

declare global {
  interface Window {
    umami: any
  }
}

// HOW-TO: ?debug=password or ?debug=false to activate/deactivate debug mode
const debugParam =
  typeof window !== 'undefined'
    ? queryString.parse(window.location.search).debug?.toString()
    : undefined
export const DEBUG: string =
  debugParam !== undefined
    ? debugParam
    : typeof window !== 'undefined'
    ? localStorage.getItem('debug')
    : null
export const IS_DEBUG = debugParam !== undefined && debugParam !== 'false'
if (debugParam !== undefined) localStorage.setItem('debug', DEBUG)
if (debugParam === 'false') localStorage.removeItem('debug')

export function isAddress(value: any): string | false {
  try {
    return getAddress(value)
  } catch {
    return false
  }
}

export function shortenAddress(address: string): string {
  return `${address?.substr(0, 6)}...${address?.substr(38, 4)}`
}

export function getContract(
  address: string,
  ABI: any,
  library: Web3Provider,
  account?: string
): Contract {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new Contract(
    address,
    ABI,
    getProviderOrSigner(library, account) as any
  )
}

export function getProviderOrSigner(
  library: Web3Provider,
  account?: string
): Web3Provider | JsonRpcSigner {
  return account ? getSigner(library, account) : library
}

export function getSigner(
  library: Web3Provider,
  account: string
): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked()
}

export const injected = new InjectedConnector({
  supportedChainIds: SUPPORTED_NETWORKS_IDS,
})

export const walletConnect = new WalletConnectConnector({
  infuraId: INFURA_KEY,
  rpc: RPCS,
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
})

export const network = new NetworkConnector({
  urls: { 1: NETWORKS.mainnet.rpcUrl },
  defaultChainId: 1,
})

export const toFixed = function (x) {
  if (Math.abs(x) < 1.0) {
    const e = parseInt(x.toString().split('e-')[1])
    if (e) {
      x *= Math.pow(10, e - 1)
      x = '0.' + new Array(e).join('0') + x.toString().substring(2)
    }
  } else {
    let e = parseInt(x.toString().split('+')[1])
    if (e > 20) {
      e -= 20
      x /= Math.pow(10, e)
      x += new Array(e + 1).join('0')
    }
  }
  return x
}

export const trimCurrencyForWhales = (labelValue: number): string | number => {
  // Nine Zeroes for Billions
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(2) + 'B'
    : // Six Zeroes for Millions
    Math.abs(Number(labelValue)) >= 1.0e6
    ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(2) + 'M'
    : // Three Zeroes for Thousands
    Math.abs(Number(labelValue)) >= 1.0e3
    ? (Math.abs(Number(labelValue)) / 1.0e3).toFixed(2) + 'K'
    : Math.abs(Number(labelValue))
}

export const track = (event: string, value?: any): void => {
  if (typeof window !== 'undefined') {
    // TODO: change type of event value to JSON instead of varchar(50)
    // window.umami.trackEvent(typeof value === 'object' ? JSON.stringify(value) : value, event)
    window?.umami?.trackEvent(
      typeof value === 'object' ? Object.values(value).join('|') : value,
      event
    )
  }
}

export function hashPersonalMessage(msg: string): string {
  const buffer = Buffer.from(msg)
  const result = ethUtil.hashPersonalMessage(buffer)
  const hash = ethUtil.bufferToHex(result)
  return hash
}

export function recoverPublicKey(sig: string, hash: string): string {
  const sigParams = ethUtil.fromRpcSig(sig)
  const hashBuffer = Buffer.from(hash.replace('0x', ''), 'hex')
  const result = ethUtil.ecrecover(
    hashBuffer,
    sigParams.v,
    sigParams.r,
    sigParams.s
  )
  const signer = ethUtil.bufferToHex(ethUtil.publicToAddress(result))
  return signer
}

export function recoverPersonalSignature(sig: string, msg: string): string {
  const hash = hashPersonalMessage(msg)
  const signer = recoverPublicKey(sig, hash)
  return signer
}

export function verifySignature(
  address: string,
  signature: string,
  message: string
): boolean {
  const signer = recoverPersonalSignature(signature, message)
  return signer.toLowerCase() === address.toLowerCase()
}

export async function getSignature(
  library: Web3Provider,
  address: string,
  message: string
): Promise<string> {
  const signature = await library.send('personal_sign', [
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)),
    address.toLowerCase(),
  ])
  return signature
}

export const verifyTypedSignature = (
  signature,
  message,
  address,
  types,
  domain
): boolean => {
  return (
    verifyTypedData(domain, types, message, signature).toLowerCase() ===
    address.toLowerCase()
  )
}

export async function validateOnchainQuest(
  quest: string,
  address: string,
  tx?: string
): Promise<boolean> {
  try {
    if (quest === 'DEXAggregators') {
      const check = []
      const matic: Network = {
        name: 'matic',
        chainId: NETWORKS['matic'].chainId,
        _defaultProvider: (providers) =>
          new providers.JsonRpcProvider(
            `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`
          ),
      }
      const provider = ethers.getDefaultProvider(matic)
      const receipt = await provider.waitForTransaction(tx, 2)
      // console.log('receipt', receipt.status)
      if (receipt?.status) {
        check.push(true)
        console.log('OK tx status confirmed')
        const txDetails = await provider.getTransaction(tx)
        // console.log('txDetails', txDetails)
        if (txDetails) {
          if (txDetails.data.includes(address.toLowerCase().substring(2))) {
            check.push(true)
            console.log('OK wallet interaction')
          }
          // 1inch v4 router contract
          const address1inchV4 =
            '0x1111111254fb6c44bac0bed2854e76f90643097d'.toLowerCase()
          // 1inch v5 router contract
          const address1inchV5 =
            '0x1111111254EEB25477B68fb85Ed929f73A960582'.toLowerCase()
          // 1inch Liquidity Pool
          const address1inchLP =
            '0x8Acdb3bcC5101b1Ba8a5070F003a77A2da376fe8'.toLowerCase()
          if (
            txDetails.data.includes(address1inchV4.substring(2)) ||
            txDetails.data.includes(address1inchV5.substring(2)) ||
            txDetails.data.includes(address1inchLP.substring(2))
          ) {
            check.push(true)
            console.log('OK 1inch router contract interaction')
          }
        }
      }
      console.log('checks validated (3)', check.length)
      return check.length === 3
    }
    if (quest === 'Layer2Blockchains') {
      const matic: Network = {
        name: 'optimism',
        chainId: 10,
        _defaultProvider: (providers) =>
          new providers.JsonRpcProvider(
            `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`
          ),
      }
      const provider = ethers.getDefaultProvider(matic)
      const bigNumberBalance = await provider.getBalance(address.toLowerCase())
      const balance = parseFloat(ethers.utils.formatEther(bigNumberBalance))
      console.log('balance: ', balance)
      return balance >= 0.001
    }
    return false
  } catch (error) {
    console.error(error)
    return false
  }
}

// TODO: remove debug
if (ACTIVATE_MIXPANEL) {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_ID, {
    api_host: '/mp',
    debug: true,
  })
}

export const mixpanel_distinct_id = ACTIVATE_MIXPANEL
  ? mixpanel.get_distinct_id()
  : null

export const Mixpanel = ACTIVATE_MIXPANEL
  ? {
      identify: (id: string) => {
        mixpanel.identify(id)
      },
      alias: (id: string) => {
        mixpanel.alias(id)
      },
      track: (event_name: string, props?: Dict) => {
        const wallets = {
          wallets: localStorage.getItem('wallets')
            ? JSON.parse(localStorage.getItem('wallets'))
            : [],
        }
        const current_wallet = localStorage.getItem('current_wallet')
        if (current_wallet) {
          const mp_current_wallet = localStorage.getItem(`mp_${current_wallet}`)
          if (!mp_current_wallet?.length) {
            mixpanel.alias(current_wallet)
            mixpanel.people.set({ name: current_wallet, wallets })
            localStorage.setItem(`mp_${current_wallet}`, mixpanel_distinct_id)
          }
        }
        const embed = localStorage.getItem('embed')
        if (embed && embed.length) {
          props.embed = embed
        }
        mixpanel.track(event_name, { domain: DOMAIN_PROD, ...props })
      },
      track_links: (query: Query, name: string) => {
        mixpanel.track_links(query, name, {
          referrer: document.referrer,
        })
      },
      people: {
        set: (props: Dict) => {
          mixpanel.people.set(props)
        },
      },
    }
  : {
      identify: (id: string) => {
        console.log(id)
      },
      alias: (id: string) => {
        console.log(id)
      },
      track: (event_name: string, props?: Dict) => {
        console.log(event_name)
        console.log(props)
      },
      track_links: (query: Query, name: string) => {
        console.log(query)
        console.log(name)
      },
      people: {
        set: (props: Dict) => {
          console.log(props)
        },
      },
    }

export const getNodeText = (node) => {
  if (['string', 'number'].includes(typeof node)) return node
  if (node instanceof Array) return node.map(getNodeText).join('')
  if (typeof node === 'object' && node) return getNodeText(node.props.children)
}

export async function api(url: string, data: any): Promise<AxiosResponse> {
  try {
    const embed =
      typeof localStorage !== 'undefined' ? localStorage.getItem('embed') : null
    if (embed && embed.length) {
      data.embed = embed
    }
    const result = await axios.post(url, data)
    if (result && result.status !== 200) {
      console.log('error API', result)
    } else {
      return result
    }
  } catch (error) {
    console.error(error)
  }
}

export async function getArticlesCollected(address: string): Promise<[]> {
  try {
    const ownerNFTs = await axios.get(
      `https://opt-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}/getNFTs?owner=${address}&pageSize=100${MIRROR_ARTICLE_ADDRESSES.map(
        (articlAddress) => `&contractAddresses[]=${articlAddress}`
      ).join()}&withMetadata=false`
    )
    if (ownerNFTs.data) {
      // console.log(ownerNFTs.data?.ownedNfts)
      const articlesCollected = ownerNFTs.data?.ownedNfts.map(
        (nft) => nft.contract.address
      )
      // console.log(articlesCollected)
      return articlesCollected
    } else {
      return []
    }
  } catch (error) {
    console.error(error)
    return []
  }
}
