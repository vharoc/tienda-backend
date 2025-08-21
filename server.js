require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Clave secreta de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Producto de ejemplo" },
            unit_amount: 2000, // $20.00
          },
          quantity: 1,
        },
      ],
      success_url: "https://vharoc.github.io/tienda/success.html",
      cancel_url: "https://vharoc.github.io/tienda/cancel.html",
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242; // 4242 solo si lo ejecutas localmente
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
