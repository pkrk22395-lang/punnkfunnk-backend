const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Flipkart API Route
app.post('/api/flipkart/orders', async (req, res) => {
    const { appId, appSecret } = req.body;
    try {
        const authHeader = Buffer.from(`${appId}:${appSecret}`).toString('base64');
        const tokenResponse = await axios.get('https://api.flipkart.net/oauth-service/oauth/token?grant_type=client_credentials&scope=seller_api', {
            headers: { 'Authorization': `Basic ${authHeader}` }
        });
        const accessToken = tokenResponse.data.access_token;
        const ordersResponse = await axios.post('https://api.flipkart.net/sellers/v3/shipments/filter', {
            filter: { states: ["APPROVED", "PACKED", "READY_TO_DISPATCH"] }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json({ success: true, data: ordersResponse.data });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Flipkart API Sync Failed' });
    }
});

// Amazon SP-API Route
app.post('/api/amazon/orders', async (req, res) => {
    const { clientId, clientSecret, refreshToken } = req.body;
    try {
        const tokenResponse = await axios.post('https://api.amazon.com/auth/o2/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenResponse.data.access_token;
        const ordersResponse = await axios.get('https://sellingpartnerapi-eu.amazon.com/orders/v0/orders?MarketplaceIds=A21TJRUUN4KGV', {
            headers: { 'x-amz-access-token': accessToken }
        });
        res.json({ success: true, data: ordersResponse.data });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Amazon API Sync Failed' });
    }
});
// Shopify Orders Route
app.post('/api/shopify/orders', async (req, res) => {
  try {
    const { shop, apiSecret } = req.body;
    const shopDomain = shop || 'wowstores-in.myshopify.com';
    const accessToken = apiSecret || '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';

    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/orders.json?status=any&limit=250`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`PunnkFunnk Proxy Server running on port ${PORT}`);
});
