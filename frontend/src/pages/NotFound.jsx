import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <main className="container mx-auto px-4 py-20 text-center">
    <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">404 · Page not found</p>
    <h1 className="mt-3 text-3xl font-bold text-gray-900">We couldn’t find that page</h1>
    <p className="mx-auto mt-3 max-w-xl text-gray-600">
      The link may be outdated, or the address may have been entered incorrectly.
    </p>
    <Link to="/home" className="btn-primary mt-7 inline-flex">
      Return to the website
    </Link>
  </main>
);

export default NotFound;
