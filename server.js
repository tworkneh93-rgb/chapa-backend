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

    // Optional: enforce pricing rules
    const pricing = {
      "login": 20.0,
      "signup": 100.0
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
        amount: amount.toFixed(2), // format as string "100.00"
        currency: 'ETB',
        email: email,
        first_name: name,
        last_name: 'N/A',
        description: description || `Payment for ${paymentType}`,
        return_url: 'https://chapa-backend-i1wy.onrender.com/payment-result', // HTTPS URL
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
      tx_ref: reference
    });

  } catch (error) {
    console.error('Chapa Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment setup failed' });
  }
});

// Payment return route - redirects to your app
app.get('/payment-result', (req, res) => {
  // Redirect to Android app deep link
  res.redirect('myeduapp://payment-result');
});

// Health check (for Render)
app.get('/', (req, res) => {
  res.send('Chapa Backend is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
