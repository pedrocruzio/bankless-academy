/* eslint-disable no-console */
import { useState, useEffect } from 'react'
import { Button, Link, useToast, Spinner } from '@chakra-ui/react'
import axios from 'axios'

import { useActiveWeb3React } from 'hooks'
import switchNetwork from 'components/SwitchNetworkButton/switchNetwork'
import {
  MINTKUDOS_API,
  MINTKUDOS_DOMAIN_INFO,
  MINTKUDOS_EXPLORER,
  MINTKUDOS_CHAIN_ID,
} from 'constants/index'
import { NETWORKS } from 'constants/networks'

const MintKudos = ({ kudosId }: { kudosId: number }): React.ReactElement => {
  const [isKudosMinted, setIsKudosMinted] = useState(false)
  const [isKudosClaimed, setIsKudosClaimed] = useState(false)
  const [status, setStatus] = useState('')

  const { account, library, chainId } = useActiveWeb3React()
  const toast = useToast()

  // TODO: update toast https://chakra-ui.com/docs/components/toast/usage#updating-toasts

  useEffect(() => {
    axios
      .get(`${MINTKUDOS_API}/v1/wallets/${account}/tokens`)
      .then(function (res) {
        if (res.data?.data?.some((k) => k?.kudosId === kudosId))
          // setIsKudosClaimed(true)
          setIsKudosClaimed(false)
        // TODO: store in localStorage also
      })
      .catch(function (error) {
        console.error(error)
      })
  }, [account])

  const followOperation = async (location: string, iteration = 0) => {
    try {
      const result = await axios.get(location)
      if (result.data?.status !== 'success') {
        if (iteration === 0) {
          toast.closeAll()
          const txLink = `${MINTKUDOS_EXPLORER}tx/${result.data.txHash}`
          toast({
            title: `Transaction in progress`,
            description: (
              <Link href={txLink} target="_blank">
                {txLink}
              </Link>
            ),
            status: 'warning',
            duration: null,
          })
        }
        // wait 1 sec
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await followOperation(location, iteration + 1)
      } else {
        console.log('done!')
      }
      console.log(result.data?.status)
    } catch (error) {
      // TODO: add error feedback
      console.error(error)
    }
  }

  const mintKudos = async () => {
    try {
      setStatus('⚒️ minting in progress ...')
      const bodyParameters = {
        address: account,
        kudosId,
      }
      const result = await axios.post(`/api/mint-kudos`, bodyParameters)
      console.log(result.data)
      if (result.data.location) {
        await followOperation(result.data.location)
        setIsKudosMinted(true)
        toast.closeAll()
        toast({
          title: 'Minting done! ✅',
          // TODO: add OpenSea link
          status: 'success',
          duration: 5000,
        })
        setStatus('')
      } else {
        setStatus('')
        if (result.data.status === 'address already on allowlist') {
          setIsKudosMinted(true)
        }
        toast.closeAll()
        toast({
          title: '⚠️ problem while minting',
          description: result.data.status || result.data.error,
          status: 'error',
          duration: 5000,
        })
      }
      // TODO: check header/Location to know when the token has been claimed
    } catch (error) {
      // TODO: add error feedback
      console.error(error)
    }
  }

  const claimKudos = async () => {
    if (isKudosClaimed) return

    setStatus('🙌 claiming in progress ...')
    const types = {
      Claim: [{ name: 'tokenId', type: 'uint256' }],
    }

    // The data to sign
    const value = {
      tokenId: kudosId,
    }

    try {
      const signer = library.getSigner(account)
      const signature = await signer._signTypedData(
        MINTKUDOS_DOMAIN_INFO,
        types,
        value
      )
      // console.log('signature', signature)
      const bodyParameters = {
        address: account,
        kudosId,
        signature,
        message: value,
      }
      const result = await axios.post(`/api/claim-kudos`, bodyParameters)
      console.log(result.data)
      if (result.data.location) {
        await followOperation(result.data.location)
        setIsKudosClaimed(true)
        toast.closeAll()
        toast({
          title: 'Claiming done! ✅',
          // TODO: add OpenSea link
          status: 'success',
          duration: 5000,
        })
        setStatus('')
      } else {
        setStatus('')
        toast.closeAll()
        toast({
          title: '⚠️ problem while claiming',
          description: result.data.status || result.data.error,
          status: 'error',
          duration: 5000,
        })
      }
      // TODO: check header/Location to know when the token has been claimed
    } catch (error) {
      // TODO: add error feedback
      console.error(error)
    }
  }

  const signatureButton = () => (
    <>
      <Button
        colorScheme={isKudosClaimed ? 'green' : 'red'}
        onClick={!isKudosMinted ? mintKudos : claimKudos}
        variant="primary"
      >
        {status !== ''
          ? status
          : !isKudosMinted
          ? 'Mint Credential ⚒️'
          : isKudosClaimed
          ? 'Credential claimed 🎉'
          : 'Claim your Credential 🙌'}
      </Button>
    </>
  )

  const networkKey = Object.keys(NETWORKS).find(
    (network) => NETWORKS[network].chainId === MINTKUDOS_CHAIN_ID
  )

  const networkSwitchButton = () => (
    <>
      <Button
        colorScheme={isKudosClaimed ? 'green' : 'red'}
        onClick={() => switchNetwork(networkKey)}
      >
        Switch Network to {NETWORKS[networkKey]?.name}
      </Button>
    </>
  )

  const ConnectFirstButton = (
    <>
      <Button
        variant="outlined"
        leftIcon={<Spinner speed="1s" />}
        color={'orange'}
        cursor="default"
        boxShadow="none !important"
      >
        {'Waiting to detect your wallet ...'}
      </Button>
      <p>
        {`To collect your lesson credential, click the "Connect wallet" button in the top-right corner`}
      </p>
    </>
  )

  return (
    <>
      {!account ? (
        <>{ConnectFirstButton}</>
      ) : chainId === MINTKUDOS_CHAIN_ID ? (
        signatureButton()
      ) : (
        networkSwitchButton()
      )}
    </>
  )
}

export default MintKudos
