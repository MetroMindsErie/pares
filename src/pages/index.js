"use client";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeaturedListings from "@/components/FeaturedListings";
import About from "../components/About";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import SearchBar from "../components/Search";
import client from "../../contentful";
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';  // or your custom tailwind.css

export default function Home({ heroContent, featuredListings }) {
  return (
    <div>
      <header>
        <Navbar />
      </header>
      <main>
        <SearchBar />
        <FeaturedListings featuredListings={featuredListings} />
        <Hero heroContent={heroContent} />
        <About />
        <Contact />
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}

export async function getStaticProps() {
  const heroRes = await client.getEntries({ content_type: 'agent' });
  const listingsRes = await client.getEntries({ content_type: 'property' });

  return {
    props: {
      heroContent: heroRes.items[0]?.fields || null,
      featuredListings: listingsRes.items.map((item) => item.fields) || [],
    },
    revalidate: 1, // ISR
  };
}
