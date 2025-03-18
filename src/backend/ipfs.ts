import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();
const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

if (!PINATA_API_KEY || !PINATA_API_SECRET) {
  throw new Error('Pinata API key and secret must be set in environment variables');
}

// Upload file to IPFS
export const uploadToIPFS = async (fileBuffer: Buffer): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'token-image.png'
    });

    const response = await axios.post(PINATA_API_URL, formData, {
      maxBodyLength: Infinity,
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET,
        ...formData.getHeaders()
      }
    });

    return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload to IPFS');
  }
};
