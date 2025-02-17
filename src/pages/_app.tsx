import type { AppProps } from 'next/app'
import { Web3ReactProvider } from '@web3-react/core'
import { ethers } from 'ethers'
import { Global, css } from '@emotion/react'
import 'react-notion-x/src/styles.css'
import 'prismjs/themes/prism-tomorrow.css'
import 'mac-scrollbar/dist/mac-scrollbar.css'
import { GlobalScrollbar } from 'mac-scrollbar'
import { isMobile } from 'react-device-detect'

import dynamic from 'next/dynamic'
import Head, { MetaData } from 'components/Head'
import Layout from 'layout'
import ThemeProvider from 'theme'
import { DEBUG } from 'utils/index'

function getLibrary(provider) {
  return new ethers.providers.Web3Provider(provider) // this will vary according to whether you use e.g. ethers or web3.js
}

const Web3ReactProviderDefault = dynamic(
  () => import('providers/Web3ReactProviderDefaultSSR'),
  { ssr: false }
)

const App = ({
  Component,
  pageProps,
}: AppProps<{
  pageMeta: MetaData
  isNotion: boolean
}>): JSX.Element => {
  if (
    (process.env.NEXT_PUBLIC_MAINTENANCE &&
      process.env.NEXT_PUBLIC_MAINTENANCE !== DEBUG) ||
    pageProps.pageMeta?.title === 'Maintenance'
  ) {
    return <>Maintenance in progress ...</>
  }
  return (
    <>
      <Head metadata={pageProps.pageMeta} />
      {!isMobile && <GlobalScrollbar skin="dark" />}
      <ThemeProvider>
        <Web3ReactProvider getLibrary={getLibrary}>
          <Web3ReactProviderDefault getLibrary={getLibrary}>
            <Global
              styles={css`
                .web3modal-modal-lightbox {
                  background: linear-gradient(
                    152.97deg,
                    rgba(0, 0, 0, 0.45) 0%,
                    rgba(38, 38, 38, 0.25) 100%
                  );
                  backdrop-filter: blur(42px);
                }
                .web3modal-modal-card {
                  border: 1px solid #646587 !important;
                  box-shadow: 0px 0px 50px 0px rgba(123, 0, 255, 0.25) !important;
                  backdrop-filter: blur(42px) !important;
                }
                /* Disable focus border in Chakra-UI */
                *:focus {
                  box-shadow: none !important;
                }
                /* custom scrollbar color & width */
                .ms-track .ms-thumb {
                  background: #916ab8;
                }
                .ms-track.ms-y .ms-thumb {
                  width: 7px;
                }
              `}
            />
            <Layout isLesson={pageProps.pageMeta?.isLesson || false}>
              <Component {...pageProps} />
            </Layout>
          </Web3ReactProviderDefault>
        </Web3ReactProvider>
      </ThemeProvider>
    </>
  )
}

export default App
