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
      success_url: "https://vharoc.github.io/tienda/success.html",
      cancel_url: "https://vharoc.github.io/tienda/index.html",
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});