require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  // Manejar los eventos
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;

      // Rescatamos los datos del cliente de la metadata y los detalles de la sesión
      const datosEnvio = session.metadata;
      const emailCliente = session.customer_details ? session.customer_details.email : 'No disponible';
      const monto = (session.amount_total / 100).toFixed(2);
      
      console.log("✅ Pago completado. Enviando correo de notificación...");

      // Preparamos el contenido del correo con los datos
      const emailText = `
        ¡Nuevo pedido completado en PowerHub!

        --- Detalles del Pago ---
        Monto: ${monto} EUR
        Cliente: ${emailCliente}
        Session ID: ${session.id}

        --- Información de Envío ---
        Nombre: ${datosEnvio.nombre || 'No proporcionado'}
        Teléfono: ${datosEnvio.telefono || 'No proporcionado'}
        Dirección: ${datosEnvio.direccion || 'No proporcionada'}
        Provincia: ${datosEnvio.provincia || 'No proporcionada'}
        Ciudad: ${datosEnvio.ciudad || 'No proporcionada'}
        Código Postal: ${datosEnvio.codigoPostal || 'No proporcionado'}
      `;

      try {
        await transporter.sendMail({
          from: process.env.NOTIFY_FROM,
          to: process.env.NOTIFY_TO,
          subject: "💸 Nuevo pedido completado en PowerHub",
          text: emailText,
        });
        console.log("✅ Correo enviado correctamente.");
      } catch (e) {
        console.error("❌ Error al enviar correo:", e);
      }
      
      break;
    // Puedes manejar otros eventos aquí si es necesario
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

  res.json({ received: true });
});

// ---------- BODY PARSER JSON PARA EL RESTO ----------
app.use(express.json());

// ---------- CORS para tus rutas normales ----------
app.use(cors({
  origin: "https://powerhub.page",
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ---------- CREAR SESIÓN DE CHECKOUT ----------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { cantidad, nombre, telefono, direccion, provincia, ciudad, codigoPostal } = req.body;
    const precioUnitario = 2000;
    const gastosEnvio = 400;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        { price_data: { currency: "eur", product_data: { name: "Producto de ejemplo" }, unit_amount: precioUnitario }, quantity: cantidad },
        { price_data: { currency: "eur", product_data: { name: "Gastos de envío" }, unit_amount: gastosEnvio }, quantity: 1 },
      ],

      // Capturar informacion del cliente
      //shipping_address_collection: {
        //allowed_countries: ['ES'], // Solo permitir España
      //},

      metadata: {
        nombre: nombre,
        telefono: telefono,
        direccion: direccion,
        provincia: provincia,
        ciudad: ciudad,
        codigoPostal: codigoPostal
      },

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