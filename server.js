const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Flipkart API Route
app.post('/api/flipkart/orders', async (req, res) => {
    const appId = req.body.appId || process.env.FLIPKART_APP_ID || '878458478b166a375bb5058a1b0801b5b023';
    const appSecret = req.body.appSecret || process.env.FLIPKART_APP_SECRET || '241dda61d4c1af4cc80f432e1aad38c85';
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

// Shopify OAuth Callback Route
app.get('/api/shopify/callback', async (req, res) => {
    const { shop, code } = req.query;
    if (code) {
        try {
            await fetch(`https://${shop}/admin/oauth/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: '86a1dd65b872cf0890a33046e6214c20',
                    client_secret: process.env.PUNNKFUNNK_SHOPIFY_CLIENT_SECRET,
                    code: code
                })
            });
        } catch (e) {
            console.log('Token exchange error', e);
        }
    }
    res.redirect(`https://${shop}/admin/apps`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
