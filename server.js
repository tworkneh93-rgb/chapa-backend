const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON requests
app.use(express.json());

// Endpoint: Create Chapa Payment
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, email, name, description, userId, paymentType } = req.body;

    // Validate required fields
    if (!amount || !email || !name || !userId || !paymentType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Optional: Enforce your pricing rules
    const pricing = {
      "login": "20.00",
      "signup": "100.00"
    };

    if (paymentType in pricing) {
      if (parseFloat(amount) !== parseFloat(pricing[paymentType])) {
        return res.status(400).json({ error: `Invalid amount for ${paymentType}. Expected: ETB ${pricing[paymentType]}` });
      }
    } else {
      return res.status(400).json({ error: "Invalid payment type. Use 'login' or 'signup'." });
    }

    const reference = `${paymentType}_${userId}_${Date.now()}`;

    // Call Chapa API
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount: amount,
        currency: 'ETB',
        email: email,
        first_name: name,
        last_name: '',
        description: description || `Payment for ${paymentType}`,
        callback_url: 'https://yourdomain.onrender.com/webhook', // Optional
        return_url: 'myeduapp://payment-result',
        reference: reference,
        tx_ref: reference,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      checkout_url: chapaResponse.data.data.checkout_url,
      reference: reference
    });

  } catch (error) {
    console.error('Chapa Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment setup failed' });
  }
});

// Health check (for Render)
app.get('/', (req, res) => {
  res.send('Chapa Backend is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});