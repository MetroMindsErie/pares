export default function handler(req, res) {
  if (req.method === 'GET') {
    // Return a JSON response with a link to the full Terms of Service page
    // This endpoint can be used as the "Terms URL" for Facebook and other platforms
    return res.status(200).json({
      message: "Terms of Service for Pares",
      termsUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.headers.origin}/terms-of-service`,
      lastUpdated: new Date().toISOString(),
      contactEmail: "support@example.com" // Replace with your actual support email
    });
  }
  
  // Handle other HTTP methods
  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
