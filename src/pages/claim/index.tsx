import { GetStaticProps } from 'next'
import { PageMetaProps } from '../../components/global/Head'

const pageMeta: PageMetaProps = {
  title: 'Claim BANK',
  description: 'This is the claim page',
  url: 'https://www.bankless.community/claim',
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: { pageMeta },
  }
}

const Home = (): JSX.Element => <div>Claim</div>

export default Home
