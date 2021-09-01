import { INFURA_ID } from './index'

export default Object.freeze({
  mainnet: {
    name: 'mainnet',
    color: '#ff8b9e',
    chainId: 1,
    rpcUrl: `https://mainnet.infura.io/v3/${INFURA_ID}`,
    blockExplorer: 'https://etherscan.io/',
  },
  kovan: {
    name: 'kovan',
    color: '#7003DD',
    chainId: 42,
    rpcUrl: `https://kovan.infura.io/v3/${INFURA_ID}`,
    blockExplorer: 'https://kovan.etherscan.io/',
    faucet: 'https://gitter.im/kovan-testnet/faucet',
  },
  matic: {
    name: 'matic',
    networkName: 'Matic(Polygon) Mainnet',
    currencySymbol: 'MATIC',
    color: '#2bbdf7',
    chainId: 137,
    price: 1,
    gasPrice: 1000000000,
    rpcUrl: 'https://rpc-mainnet.matic.network',
    faucet: 'https://faucet.matic.network/',
    blockExplorer: 'https://polygonscan.com',
  },
  mumbai: {
    name: 'mumbai',
    networkName: 'Matic(Polygon) Testnet Mumbai',
    currencySymbol: 'tMATIC',
    color: '#92D9FA',
    chainId: 80001,
    price: 1,
    gasPrice: 1000000000,
    rpcUrl: 'https://rpc-mumbai.matic.today',
    faucet: 'https://faucet.matic.network/',
    blockExplorer: 'https://mumbai.polygonscan.com/',
  },
})
