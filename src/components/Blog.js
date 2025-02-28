import React from 'react';

const Blog = () => {
  const blogPosts = [
    {
      title: 'The Future of Real Estate Investment',
      excerpt: 'Discover how blockchain technology is revolutionizing the real estate market...',
      link: '#'
    },
    {
      title: 'Top 10 Tips for First-Time Home Buyers',
      excerpt: 'Buying your first home can be daunting. Here are our top tips to help you navigate the process...',
      link: '#'
    },
    {
      title: 'Understanding Real Estate-Backed Stablecoins',
      excerpt: 'Learn about the benefits and mechanics of investing in real estate-backed stablecoins...',
      link: '#'
    }
  ];

  return (
    <section className="p-10 bg-white">
      <div className="text-center mb-6">
        <img src="/pares4.jpeg" alt="Blog" className="mx-auto w-32 h-32 rounded-full" />
      </div>
      <div className="flex flex-wrap justify-center">
        {blogPosts.map((post, index) => (
          <div key={index} className="w-full md:w-1/2 lg:w-1/3 p-4">
            <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold">{post.title}</h3>
              <p className="mt-2 text-gray-600">{post.excerpt}</p>
              <a href={post.link} className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Read More
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Blog;
