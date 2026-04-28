import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

// Lazy initialization for clients
let stripeClient: Stripe | null = null;
let mpClient: MercadoPagoConfig | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

function getMercadoPago(): MercadoPagoConfig {
  if (!mpClient) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable is required');
    }
    mpClient = new MercadoPagoConfig({ accessToken: token });
  }
  return mpClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (sig && endpointSecret) {
        event = getStripe().webhooks.constructEvent(req.body, sig as string, endpointSecret);
      } else {
        // Skip verification if secret is not set (convenience for dev, but NOT for production)
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const appointmentId = paymentIntent.metadata.appointmentId;

      if (appointmentId) {
        console.log(`Payment confirmed for appointment: ${appointmentId}`);
        // Here you would use firebase-admin to update the doc
        // For example: await db.collection('appointments').doc(appointmentId).update({ paid: true, status: 'confirmado' });
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, appointmentId } = req.body;
      
      // Calculate 20% fee + 0.50 admin fee
      const bookingFee = (amount * 0.20) + 0.50;
      const amountInCents = Math.round(bookingFee * 100);

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "brl",
        metadata: {
          originalTotal: amount.toString(),
          feeApplied: "20% + 0.50 BRL",
          appointmentId: appointmentId || ""
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/mercadopago/create-pix", async (req, res) => {
    try {
      const { amount, name, email, appointmentId } = req.body;
      
      const payment = new Payment(getMercadoPago());
      
      const result = await payment.create({
        body: {
          transaction_amount: amount,
          description: `Agendamento - PK Barbershop (${appointmentId})`,
          payment_method_id: 'pix',
          payer: {
            email: email || 'cliente@exemplo.com',
            first_name: name || 'Cliente',
            last_name: 'PK'
          },
          metadata: {
            appointment_id: appointmentId
          }
        }
      });

      res.json({
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        payment_id: result.id
      });
    } catch (error: any) {
      console.error("Mercado Pago Error:", error);
      res.status(400).send({ error: error.message });
    }
  });

  app.post("/api/mercadopago/webhook", async (req, res) => {
    const { action, data } = req.body;

    // We only care about payments
    if (action === "payment.created" || action === "payment.updated") {
      try {
        const paymentId = data.id;
        const payment = new Payment(getMercadoPago());
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo.status === "approved") {
          const appointmentId = paymentInfo.metadata?.appointment_id;

          if (appointmentId) {
            console.log(`Pagamento aprovado para o agendamento: ${appointmentId}`);
            
            // Update Firestore automatically
            await db.collection('appointments').doc(appointmentId).update({
              paid: true,
              status: 'confirmado'
            });
            
            console.log("Status atualizado com sucesso!");
          }
        }
      } catch (error) {
        console.error("Erro ao processar webhook MP:", error);
      }
    }

    // Always 200 to Mercado Pago
    res.status(200).send("OK");
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
