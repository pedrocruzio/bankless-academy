import Web3Modal from 'web3modal'
import React, { useState, useEffect } from 'react'
import WalletConnectProvider from '@walletconnect/web3-provider'
import {
  Button,
  Text,
  Popover,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  SimpleGrid,
  Box,
  Image,
  useToast,
  useDisclosure,
  Heading,
} from '@chakra-ui/react'
import { Wallet } from 'phosphor-react'
import axios from 'axios'
import Davatar from '@davatar/react'
import { useLocalStorage } from 'usehooks-ts'
import styled from '@emotion/styled'
import { useRouter } from 'next/router'
import { getDefaultProvider } from '@ethersproject/providers'

// TEMP: fix https://github.com/chakra-ui/chakra-ui/issues/5896
import { PopoverTrigger as OrigPopoverTrigger } from '@chakra-ui/react'
export const PopoverTrigger: React.FC<{ children: React.ReactNode }> =
  OrigPopoverTrigger

import ENSName from 'components/ENSName'
import ExternalLink from 'components/ExternalLink'
import { useWalletWeb3React } from 'hooks/index'
import { walletConnect, injected } from 'utils'
import { LESSONS, INFURA_KEY, ALCHEMY_KEY } from 'constants/index'
import {
  MINTKUDOS_API,
  MINTKUDOS_COMMUNITY_ID,
  KUDOS_IDS,
} from 'constants/kudos'
import { KudosType } from 'entities/kudos'
import { SUPPORTED_NETWORKS_IDS, RPCS } from 'constants/networks'

export const dAvatarProvider = getDefaultProvider(1, {
  infura: INFURA_KEY,
  alchemy: ALCHEMY_KEY,
  quorum: 1,
})

let web3Modal: Web3Modal

const Overlay = styled(Box)`
  opacity: 1;
  position: fixed;
  left: 0px;
  top: 0px;
  width: 100vw;
  height: 100vh;
  background: var(--chakra-colors-blackAlpha-600);
  z-index: 1;
  backdrop-filter: blur(2px);
`

const ConnectWalletButton = ({
  isSmallScreen,
}: {
  isSmallScreen: boolean
}): React.ReactElement => {
  const router = useRouter()
  const [web3Provider, setWeb3Provider] = useState()
  const walletWeb3ReactContext = useWalletWeb3React()
  const isConnected = walletWeb3ReactContext.active
  const walletAddress = walletWeb3ReactContext.account
  const [connectClick, setConnectClick] = useState(false)
  const [isPopOverOn, setIsPopOverOn] = useState(false)
  const [walletIsLoading, setWalletIsLoading] = useState(false)
  const [kudos, setKudos] = useState<KudosType[]>([])
  const toast = useToast()
  const web3ModalFrame = {
    cacheProvider: true,
    theme: {
      background: '#010101',
      main: 'white',
      secondary: 'white',
      border: '#252525',
      hover: '#363636',
    },
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: INFURA_KEY,
          rpc: RPCS,
        },
        connector: async () => {
          return 'walletconnect'
        },
      },
      injected: {
        package: null,
        connector: async () => {
          return 'injected'
        },
      },
    },
  }
  const [connectWalletPopupLS, setConnectWalletPopupLS] = useLocalStorage(
    `connectWalletPopup`,
    false
  )
  const [, setKudosMintedLS] = useLocalStorage('kudosMinted', [])
  const [refreshKudosLS, setRefreshKudosLS] = useLocalStorage(
    'refreshKudos',
    false
  )
  const { onClose } = useDisclosure()
  const { asPath } = useRouter()

  const isLessonPage = asPath.includes('/lessons/')

  function web3ModalConnect(web3Modal) {
    web3Modal
      .connect()
      .then((provider) => {
        if (
          !SUPPORTED_NETWORKS_IDS.includes(
            parseInt(provider?.networkVersion || provider?.chainId)
          )
        ) {
          // wrong network
          toast.closeAll()
          toast({
            title: 'Wrong network detected',
            description: 'Please switch back to Ethereum Mainnet',
            status: 'warning',
            duration: null,
          })
        } else {
          // correct network
          toast.closeAll()
        }
        setWeb3Provider(provider)
        if (provider.isMetaMask) {
          return walletWeb3ReactContext.activate(injected)
        } else {
          return walletWeb3ReactContext.activate(walletConnect)
        }
      })
      .then(() => {
        setConnectClick(false)
      })
      .catch((e) => {
        setWalletIsLoading(false)
        setConnectClick(false)
        console.error(e)
      })
  }

  useEffect(() => {
    if (
      localStorage.getItem('WEB3_CONNECT_CACHED_PROVIDER') &&
      // don't prompt MetaMask popup if wallet isn't unlocked
      !(window?.ethereum?.isMetaMask && !window?.ethereum?.selectedAddress)
    ) {
      // reflect parent web3 connection status when website is embedded
      if (
        !router.asPath.includes('embed=') ||
        !router.asPath.includes('connect=false')
      ) {
        web3Modal = new Web3Modal(web3ModalFrame)
        web3ModalConnect(web3Modal)
      }
    }
  }, [router])

  useEffect(() => {
    if (connectClick) {
      setWalletIsLoading(true)
      web3Modal = new Web3Modal(web3ModalFrame)
      web3ModalConnect(web3Modal)
    }
  }, [connectClick])

  useEffect(() => {
    if (walletAddress) {
      setRefreshKudosLS(false)
      if (
        localStorage.getItem('current_wallet') !== walletAddress.toLowerCase()
      ) {
        localStorage.removeItem('passport')
      }
      localStorage.setItem('current_wallet', walletAddress.toLowerCase())
      const wallets = localStorage.getItem('wallets')
        ? JSON.parse(localStorage.getItem('wallets'))
        : []
      if (!wallets.includes(walletAddress.toLowerCase())) {
        wallets.push(walletAddress.toLowerCase())
        localStorage.setItem('wallets', JSON.stringify(wallets))
      }
      axios
        .get(
          `${MINTKUDOS_API}/v1/wallets/${walletAddress}/tokens?limit=100&communityId=${MINTKUDOS_COMMUNITY_ID}&claimStatus=claimed`
        )
        .then((res) => {
          const data = res.data.data
          if (Array.isArray(data)) {
            setKudosMintedLS(
              KUDOS_IDS.filter((kudosId) =>
                data.some((kudos: KudosType) => kudos.kudosTokenId === kudosId)
              )
            )
            setKudos(
              data.filter((kudos: KudosType) =>
                KUDOS_IDS.includes(kudos.kudosTokenId)
              )
            )
          }
        })
    }
  }, [walletAddress, !!refreshKudosLS])

  const nbKudosToDisplay = kudos?.map((k) =>
    LESSONS.find((lesson) => lesson.kudosId === k.kudosTokenId)
  )?.length

  return (
    <>
      {isConnected ? (
        <Popover
          isOpen={isPopOverOn}
          placement="bottom-end"
          returnFocusOnClose={false}
          onClose={() => {
            onClose()
            setIsPopOverOn(false)
          }}
        >
          <PopoverTrigger>
            <Button
              variant="secondary"
              size={isSmallScreen ? 'sm' : 'md'}
              // TODO: fix bug when switching wallets
              leftIcon={
                <Davatar
                  size={25}
                  address={walletAddress}
                  provider={dAvatarProvider}
                />
              }
              onClick={() => setIsPopOverOn(!isPopOverOn)}
            >
              <Text maxW="200px" display="flex" alignItems="center" isTruncated>
                <ENSName provider={web3Provider} address={walletAddress} />
              </Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverBody>
              <Box textAlign="center" m="2">
                <Button
                  isFullWidth
                  size={isSmallScreen ? 'sm' : 'md'}
                  leftIcon={<Wallet weight="bold" />}
                  onClick={() => {
                    setIsPopOverOn(false)
                    walletWeb3ReactContext.deactivate()
                    web3Modal.clearCachedProvider()
                    localStorage.removeItem('walletconnect')
                    setWalletIsLoading(false)
                    setKudos([])
                  }}
                >
                  Disconnect wallet
                </Button>
              </Box>
              {/* TODO: move to dedicated component? */}
              {kudos?.length > 0 && (
                <>
                  <Text fontSize="xl" fontWeight="bold" textAlign="center">
                    My Academy Badges
                  </Text>
                  <Box
                    h="215px"
                    overflowY={nbKudosToDisplay <= 6 ? 'hidden' : 'scroll'}
                    overflowX="hidden"
                    backgroundColor="blackAlpha.200"
                    borderRadius="10px"
                  >
                    <SimpleGrid columns={3} spacing={3} p={3}>
                      {kudos?.map((k, index) => {
                        const lesson = LESSONS.find(
                          (lesson) => lesson.kudosId === k.kudosTokenId
                        )
                        if (lesson) {
                          if (lesson.kudosImageLink.includes('.mp4')) {
                            return (
                              <Box
                                key={`kudos-${index}`}
                                height="78px"
                                width="78px"
                                boxShadow="0px 0px 4px 2px #00000060"
                                borderRadius="3px"
                                overflow="hidden"
                                border="1px solid #4b474b"
                              >
                                <video
                                  autoPlay
                                  loop
                                  playsInline
                                  muted
                                  style={{
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <source
                                    src={lesson.kudosImageLink}
                                    type="video/mp4"
                                  ></source>
                                </video>
                              </Box>
                            )
                          } else
                            return (
                              <Box
                                key={`kudos-${index}`}
                                justifySelf="center"
                                boxShadow="0px 0px 4px 2px #00000060"
                                borderRadius="3px"
                                backgroundColor="blackAlpha.300"
                                p={1}
                              >
                                <Image
                                  src={k.assetUrl}
                                  width="70px"
                                  height="70px"
                                  alt={lesson.name}
                                  title={lesson.name}
                                />
                              </Box>
                            )
                        }
                      })}
                    </SimpleGrid>
                  </Box>
                </>
              )}
            </PopoverBody>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover
          returnFocusOnClose={false}
          placement="bottom-end"
          isOpen={connectWalletPopupLS && isLessonPage}
          onClose={() => {
            onClose()
            setConnectWalletPopupLS(false)
          }}
        >
          <Overlay
            hidden={!(connectWalletPopupLS && isLessonPage)}
            margin="0 !important"
          />
          <PopoverTrigger>
            <Button
              onClick={() => {
                setConnectClick(true)
              }}
              size={isSmallScreen ? 'sm' : 'md'}
              leftIcon={<Wallet weight="bold" />}
              isLoading={walletIsLoading}
              loadingText="Connecting wallet"
              zIndex={2}
              variant="primary"
            >
              Connect wallet
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverBody>
              <Heading as="h2" size="md" textAlign="center" my="2">
                Connect your wallet to proceed.
              </Heading>
              <Text textAlign="center">
                {`Don’t know how? `}
                <ExternalLink href="/faq#edf3a4658d3d4aa78eac62e1dcf68978">
                  Get help here
                </ExternalLink>
              </Text>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      )}
    </>
  )
}

export default ConnectWalletButton
