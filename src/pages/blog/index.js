import Head from 'next/head';
import Layout from '../../components/Layout';
import Blog from '../../components/Blog';

export default function BlogIndexPage() {
  return (
    <Layout>
      <Head>
        <title>All Blog Posts | Erie Real Estate</title>
        <meta name="description" content="Explore our full library of Erie real estate videos, stories, market insights, and neighborhood guides." />
      </Head>
      <main className="pt-16 min-h-screen bg-gradient-to-br from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Blog
            enableDetail={false}
            disablePagination={true}
            heading="All Blog Posts"
            showFilters={true}
          />
        </div>
      </main>
    </Layout>
  );
}
