require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();

// ---------- CORS ----------
app.use(cors({
  origin: "https://powerhub.page",
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---------- CREAR SESIÓN DE CHECKOUT ----------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const cantidad = parseInt(req.body.cantidad) || 1;
    const precioUnitario = 2000; // 20 € en céntimos
    const gastosEnvio = 400; // 4 € en céntimos

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Producto de ejemplo" },
            unit_amount: precioUnitario,
          },
          quantity: cantidad,
        },
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Gastos de envío" },
            unit_amount: gastosEnvio,
          },
          quantity: 1,
        },
      ],
      success_url: "https://powerhub.page/success.html", // Actualizado también aquí
      cancel_url: "https://powerhub.page",
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- INICIAR SERVIDOR ----------
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));