import React from 'react';
import { useRouter } from 'next/router';

function ErrorPage() {
  const router = useRouter();
  const statusCode = router.query?.statusCode || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">
          {statusCode
            ? `An error ${statusCode} occurred`
            : 'Something went wrong'}
        </h1>
        <p className="mb-6 text-gray-600">
          We're sorry for the inconvenience. Please try again later.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
        >
          Refresh the page
        </button>
      </div>
    </div>
  );
}

export default ErrorPage;
