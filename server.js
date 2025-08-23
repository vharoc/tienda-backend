require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---------- CORS para tus rutas normales ----------
app.use(cors({
  origin: "https://powerhub.page",
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ---------- CONFIGURACIÓN NODemailer ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ---------- WEBHOOK DE STRIPE ----------
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Error en webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await transporter.sendMail({
        from: process.env.NOTIFY_FROM,
        to: process.env.NOTIFY_TO,
        subject: "💸 Nuevo pago completado en PowerHub",
        text: `Se completó un pago por ${session.amount_total / 100} EUR.\nCliente: ${session.customer_details.email}\nSession ID: ${session.id}`,
      });

      console.log("✅ Correo enviado correctamente.");
    } catch (e) {
      console.error("❌ Error al enviar correo:", e);
    }
  }

  res.json({ received: true });
});

// ---------- BODY PARSER JSON PARA EL RESTO ----------
app.use(express.json());

// ---------- CREAR SESIÓN DE CHECKOUT ----------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const cantidad = parseInt(req.body.cantidad) || 1;
    const precioUnitario = 2000;
    const gastosEnvio = 400;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        { price_data: { currency: "eur", product_data: { name: "Producto de ejemplo" }, unit_amount: precioUnitario }, quantity: cantidad },
        { price_data: { currency: "eur", product_data: { name: "Gastos de envío" }, unit_amount: gastosEnvio }, quantity: 1 },
      ],
      success_url: "https://powerhub.page/success.html",
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