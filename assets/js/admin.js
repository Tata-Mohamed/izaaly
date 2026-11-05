// stripe-webhook — appelé par Stripe (paiements, sessions expirées, prélèvements mensuels).
// Déploiement : « Verify JWT » désactivé (la signature Stripe fait foi).
// Secrets requis : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET ; clé Supabase mon_api_izaaly_bijoux.
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const crypto = Stripe.createSubtleCryptoProvider();
// Même lecture de la clé que la fonction checkout : clé secrète Supabase nommée mon_api_izaaly_bijoux
let dbKey: string | undefined;
try { dbKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["mon_api_izaaly_bijoux"]; } catch (_) { /* ignoré */ }
dbKey = dbKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
if (!dbKey) throw new Error("Clé secrète Supabase introuvable (mon_api_izaaly_bijoux).");
const db = createClient(Deno.env.get("SUPABASE_URL")!, dbKey!);

// Libère les pièces réservées par une commande (session expirée ou paiement différé échoué)
async function libererPieces(ref?: string | null) {
  if (!ref) return;
  await db.from("products").update({ reserve_jusqua: null, reserve_ref: null }).eq("reserve_ref", ref);
}

// Commande payée : enregistre la commande, programme la fin de l'abonnement, marque les pièces vendues.
// Peut être appelée plusieurs fois pour la même session (rejeu Stripe) sans rien dupliquer.
async function commandePayee(evtSession: Stripe.Checkout.Session) {
  // Le webhook Stripe utilise une version d'API récente : on relit la session avec la version du code
  // pour retrouver les champs (adresse de livraison, etc.) à leur place habituelle.
  const s = await stripe.checkout.sessions.retrieve(evtSession.id);
  const type = s.metadata?.type ?? "panier";
  const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 30 });

  const { error } = await db.from("orders").insert({
    stripe_session: s.id,
    type,
    montant_cents: s.amount_total ?? 0,
    email: s.customer_details?.email ?? s.customer_email ?? null,
    livraison: {
      mode: s.metadata?.livraison ?? null,
      telephone: s.customer_details?.phone ?? null,
      nom: s.customer_details?.name ?? (s as any).shipping_details?.name ?? null,
      relais: s.metadata?.relais ?? null,
      adresse: (s as any).shipping_details ?? null,
      facturation: s.customer_details?.address ?? null,
    },
    lignes: items.data.map((i) => ({ nom: i.description, quantite: i.quantity, total_cents: i.amount_total })),
  });
  if (error && error.code !== "23505") throw error;   // 23505 = doublon : déjà enregistrée

  const ref = s.metadata?.ref ?? s.client_reference_id;

  // Box en mensualités : on mémorise la durée sur l'abonnement et on programme sa fin
  if (s.mode === "subscription" && s.subscription && s.metadata?.box) {
    const mois = Number(s.metadata.box.split(":")[1]);
    if (mois > 1 && mois <= 36) {
      const sub = await stripe.subscriptions.retrieve(String(s.subscription));
      const upd: Stripe.SubscriptionUpdateParams = {};
      if (!sub.cancel_at && !sub.cancel_at_period_end) {
        const d = new Date(sub.current_period_start * 1000);
        d.setUTCMonth(d.getUTCMonth() + mois);
        // un jour avant la (mois+1)-ième échéance : exactement `mois` prélèvements
        upd.cancel_at = Math.floor(d.getTime() / 1000) - 86400;
      }
      if (Object.keys(upd).length) await stripe.subscriptions.update(sub.id, upd);
    }
  }

  // Pièces uniques : vendues. Seules les pièces encore réservées par CETTE commande sont touchées.
  if (s.metadata?.ids && ref) {
    const ids = s.metadata.ids.split(",").filter(Boolean);
    const { data: rows } = await db.from("products").select("id,stock").in("id", ids).eq("reserve_ref", ref);
    for (const r of rows ?? []) {
      await db.from("products")
        .update({ stock: Math.max(0, r.stock - 1), reserve_jusqua: null, reserve_ref: null })
        .eq("id", r.id).eq("reserve_ref", ref);
    }
  }
}

// Prélèvement mensuel (réussi ou échoué) : une ligne par facture, jamais en double
async function enregistrerFacture(evtInv: Stripe.Invoice, statut: "paye" | "echoue") {
  const inv = await stripe.invoices.retrieve(evtInv.id);   // relue avec la version d'API du code
  if (!inv.subscription) return;   // facture sans abonnement : rien à suivre ici
  const subId = String(inv.subscription);
  const sub = await stripe.subscriptions.retrieve(subId);
  const periode = inv.lines?.data?.[0]?.period;
  const row = {
    stripe_invoice: inv.id,
    stripe_subscription: subId,
    ref: sub.metadata?.ref || null,
    email: inv.customer_email ?? null,
    montant_cents: statut === "paye" ? (inv.amount_paid ?? 0) : (inv.amount_due ?? 0),
    statut,
    periode_debut: periode?.start ? new Date(periode.start * 1000).toISOString() : null,
    periode_fin: periode?.end ? new Date(periode.end * 1000).toISOString() : null,
  };
  // payé : peut remplacer un « échoué » précédent ; échoué : n'écrase jamais un « payé »
  const { error } = await db.from("subscription_payments")
    .upsert(row, { onConflict: "stripe_invoice", ignoreDuplicates: statut === "echoue" });
  if (error) throw error;

  if (statut !== "paye") return;

  // Arrêt de sécurité : dernier prélèvement payé => plus aucun prélèvement après celui-ci
  // durée posée par checkout sur l'abonnement (subscription_data.metadata.mois)
  const mois = Number(sub.metadata?.mois ?? sub.metadata?.box?.split(":")[1]);
  if (mois > 1 && mois <= 36 && !sub.cancel_at_period_end) {
    const { count } = await db.from("subscription_payments")
      .select("id", { count: "exact", head: true })
      .eq("stripe_subscription", subId).eq("statut", "paye");
    if ((count ?? 0) >= mois) await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
  }
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Signature manquante", { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, crypto,
    );
  } catch (e) {
    console.error("Signature invalide", e);
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === "paid") await commandePayee(s);   // sinon : paiement différé, traité plus tard
        break;
      }
      case "checkout.session.async_payment_succeeded":
        await commandePayee(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        await libererPieces(s.metadata?.ref ?? s.client_reference_id);
        break;
      }
      case "invoice.paid":
        await enregistrerFacture(event.data.object as Stripe.Invoice, "paye");
        break;
      case "invoice.payment_failed":
        await enregistrerFacture(event.data.object as Stripe.Invoice, "echoue");
        break;
    }
  } catch (e) {
    console.error("Erreur traitement webhook", event.type, e);
    return new Response("Erreur", { status: 500 });   // Stripe réessaiera
  }
  return new Response("ok");
});
