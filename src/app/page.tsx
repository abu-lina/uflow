'use client';

import Link from "next/link";
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* User Profile Banner */}
      {user && (
        <div className="bg-emerald-100 py-3 px-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <p className="text-emerald-800">
                Welcome, <span className="font-medium">{user.email}</span>
              </p>
              <Link
                href="/profile"
                className="text-emerald-700 font-medium hover:text-emerald-900"
              >
                View your profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Islamic Marketplace for Products & Services
              </h1>
              <p className="text-lg md:text-xl text-emerald-100">
                Discover high-quality Islamic products and services from trusted sellers in the global Ummah.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/products"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-md font-medium text-lg shadow-lg inline-flex items-center justify-center"
                >
                  Explore Products
                </Link>
                <Link
                  href="/services"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400 px-6 py-3 rounded-md font-medium text-lg shadow-lg inline-flex items-center justify-center"
                >
                  Find Services
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
              {/* Placeholder for hero image - replace with your own */}
              <div className="w-full max-w-md h-80 md:h-96 relative bg-emerald-600 rounded-lg shadow-xl flex items-center justify-center">
                <span className="text-emerald-200 text-lg">Hero Image Placeholder</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Browse Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link 
                key={category.name}
                href={category.href}
                className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="h-40 bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 text-4xl">{category.icon}</span>
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-medium text-gray-900 group-hover:text-emerald-600">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link
              href="/products"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-gray-200 relative">
                  {/* Product image placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Product Image
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">{product.name}</h3>
                  <p className="text-gray-500 text-sm mb-2">{product.seller}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-600">{product.price}</span>
                    <button className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-medium">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">&quot;{testimonial.text}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Ummah Flow Today</h2>
          <p className="text-emerald-100 text-lg max-w-3xl mx-auto mb-8">
            Whether you&apos;re looking to buy quality Islamic products or sell your services to the Ummah,
            join our growing community today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-md font-medium text-lg shadow-lg inline-flex items-center justify-center"
                >
                  Go to My Profile
                </Link>
                <Link
                  href="/sellers/apply"
                  className="bg-emerald-700 text-white hover:bg-emerald-800 border border-emerald-500 px-6 py-3 rounded-md font-medium text-lg shadow-lg inline-flex items-center justify-center"
                >
                  Become a Seller
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-md font-medium text-lg shadow-lg inline-flex items-center justify-center"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400 px-6 py-3 rounded-md font-medium text-lg shadow-lg inline-flex items-center justify-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Sample data for the page
const categories = [
  { name: 'Books', icon: '📚', href: '/products/books' },
  { name: 'Clothing', icon: '👕', href: '/products/clothing' },
  { name: 'Home Decor', icon: '🏠', href: '/products/home-decor' },
  { name: 'Prayer Items', icon: '🕌', href: '/products/prayer-items' },
  { name: 'Digital Content', icon: '💻', href: '/products/digital' },
  { name: 'Health & Beauty', icon: '✨', href: '/products/health-beauty' },
  { name: 'Food', icon: '🍽️', href: '/products/food' },
  { name: 'Services', icon: '🔧', href: '/services' },
];

const products = [
  { id: 1, name: 'Premium Prayer Mat', seller: 'Islamic Home', price: '$45.99' },
  { id: 2, name: 'Digital Quran Player', seller: 'Tech Faith', price: '$89.99' },
  { id: 3, name: 'Handmade Calligraphy Art', seller: 'Art of Islam', price: '$129.99' },
  { id: 4, name: 'Organic Dates Gift Box', seller: 'Baraka Foods', price: '$35.99' },
];

const testimonials = [
  {
    name: 'Ahmed H.',
    location: 'London, UK',
    text: 'I&apos;ve been looking for quality Islamic products for my home, and Ummah Flow has the best selection I&apos;ve found online. The sellers are very responsive and shipping was fast.'
  },
  {
    name: 'Fatima K.',
    location: 'Toronto, Canada',
    text: 'As a seller on Ummah Flow, I&apos;ve been able to reach customers from around the world. The platform is easy to use and the support team is always helpful.'
  },
  {
    name: 'Yusuf M.',
    location: 'Dubai, UAE',
    text: 'The quality of products on Ummah Flow is exceptional. I ordered several items for my new apartment and was impressed with everything. Will definitely shop here again!'
  },
];
