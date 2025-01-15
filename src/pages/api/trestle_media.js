import axios from 'axios';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { propertyId } = req.query;

        try {
            const response = await axios.get(`https://api-trestle.corelogic.com/odata/Property(${propertyId})/Media/All`, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Return the media data to the frontend
            res.status(200).json(response.data);
        } catch (error) {
            // Handle error and send it back to the frontend
            console.error('Error fetching media:', error);
            res.status(500).json({ error: 'Failed to fetch media' });
        }
    } else {
        // Only allow GET requests
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}