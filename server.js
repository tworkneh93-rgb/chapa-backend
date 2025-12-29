const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON requests
app.use(express.json());

/**
 * CREATE PAYMENT
 */
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, email, name, description, userId, paymentType } = req.body;

    // ✅ Validate required fields
    if (!amount || !email || !name || !userId || !paymentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ✅ Enforce pricing rules
    const pricing = {
      login: 20.0,
      signup: 100.0,
    };

    if (!pricing[paymentType]) {
      return res
        .status(400)
        .json({ error: "Invalid paymentType. Use 'login' or 'signup'." });
    }

    if (Number(amount) !== pricing[paymentType]) {
      return res.status(400).json({
        error: `Invalid amount. Expected ETB ${pricing[paymentType]}`,
      });
    }

    // ✅ Ensure secret key exists
    if (!process.env.CHAPA_SECRET) {
      console.error('❌ CHAPA_SECRET is missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const tx_ref = `${paymentType}_${userId}_${Date.now()}`;

    // ✅ Call Chapa API
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount: Number(amount).toFixed(2), // ✅ FIXED
        currency: 'ETB',
        email: email,
        first_name: name,
        last_name: 'User',
        description: description || `Payment for ${paymentType}`,
        return_url: 'https://chapa-backend-i1wy.onrender.com/payment-result',
        tx_ref: tx_ref,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Success response
    return res.json({
      success: true,
      checkout_url: chapaResponse.data.data.checkout_url,
      tx_ref: tx_ref,
    });

  } catch (error) {
    console.error(
      '💥 Chapa API Error:',
      error.response?.data || error.message
    );
    return res.status(500).json({ error: 'Payment setup failed' });
  }
});

/**
 * PAYMENT RETURN (Redirect to Android App)
 */
app.get('/payment-result', (req, res) => {
  res.redirect('myeduapp://payment-result');
});

/**
 * HEALTH CHECK
 */
app.get('/', (req, res) => {
  res.send('Chapa Backend is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

