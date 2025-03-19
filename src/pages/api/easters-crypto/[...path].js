import { getEastersCrypto } from '../../../lib/eastersCrypto';

export default async function handler(req, res) {
  const eastersCrypto = getEastersCrypto();
  
  // Forward requests to Easter's Crypto API handler
  return eastersCrypto.apiRoutes(req, res);
}
