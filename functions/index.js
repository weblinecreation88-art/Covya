const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");

const {
  DomainError,
  verifyStripeSignature,
  publishRideSeries,
  searchRideMatches,
  requestBooking,
  updateTripLocation,
  registerDeviceToken,
  createPaymentIntent,
  refundPayment,
  updateTripStatus,
  submitRating,
  reportSafetyIssue,
  loadCompanyDashboard,
  listCompanyMembers,
  setCompanyMemberRole,
  listSafetyReports,
  resolveSafetyReport,
  respondToBooking,
  sendConversationMessage,
} = require("./services");

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({
  region: "europe-west1",
  maxInstances: 10,
});
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const mapsSecret = defineSecret("GOOGLE_MAPS_SERVER_KEY");

function stripeProvider() {
  const secret = stripeSecret.value();
  if (!secret) {
    throw new DomainError("failed-precondition", "payment provider is not configured");
  }
  async function request(path, values, idempotencyKey) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) body.append(key, String(value));
    const response = await fetch("https://api.stripe.com/v1/" + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + secret,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body,
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Stripe request failed", { status: response.status, type: result.error?.type });
      throw new DomainError("internal", "payment provider rejected the operation");
    }
    return result;
  }
  return {
    name: "stripe",
    async createIntent({ amountMinor, currency, idempotencyKey, metadata }) {
      const values = { amount: amountMinor, currency, "automatic_payment_methods[enabled]": "true" };
      for (const [key, value] of Object.entries(metadata)) values["metadata[" + key + "]"] = value;
      const result = await request("payment_intents", values, idempotencyKey);
      return { id: result.id, clientSecret: result.client_secret, status: result.status };
    },
    async refund({ paymentId, idempotencyKey }) {
      const result = await request("refunds", { payment_intent: paymentId }, idempotencyKey);
      return { id: result.id, status: result.status };
    },
  };
}

function toHttpsError(error) {
  if (error instanceof DomainError) {
    return new HttpsError(error.code, error.message);
  }
  console.error("Unexpected callable failure", {
    name: error?.name,
    message: error?.message,
  });
  return new HttpsError("internal", "Unexpected server error");
}

exports.publishRideSeries = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "A registered account is required");
    }
    try {
      return await publishRideSeries(getFirestore(), {
        actorId: request.auth.uid,
        driverName: request.auth.token.name || request.auth.token.email || "Conducteur",
        ...request.data,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

exports.searchRideMatches = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    try {
      return await searchRideMatches(getFirestore(), {
        actorId: request.auth.uid,
        ...request.data,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

exports.requestBooking = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "A registered account is required");
    }
    try {
      return await requestBooking(getFirestore(), {
        actorId: request.auth.uid,
        rideId: request.data?.rideId,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

exports.updateTripLocation = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    try {
      return await updateTripLocation(getFirestore(), {
        actorId: request.auth.uid,
        ...request.data,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);
exports.stripeWebhook = onRequest(
  { secrets: [stripeWebhookSecret] },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }
    try {
      const signatureHeader = String(request.headers["stripe-signature"] || "");
      const payload = request.rawBody.toString("utf8");
      if (!verifyStripeSignature(
        payload,
        signatureHeader,
        stripeWebhookSecret.value(),
      )) {
        response.status(400).send("Invalid signature");
        return;
      }      const event = JSON.parse(payload);
      const eventRef = getFirestore().collection("payment_events").doc(event.id);
      if ((await eventRef.get()).exists) {
        response.status(200).json({ received: true });
        return;
      }
      const paymentIntent = event.data?.object;
      if (typeof paymentIntent?.id === "string" && event.type.startsWith("payment_intent.")) {
        const matches = await getFirestore().collection("payments")
          .where("providerPaymentId", "==", paymentIntent.id).limit(1).get();
        if (!matches.empty) {
          const status = event.type === "payment_intent.succeeded"
            ? "succeeded"
            : event.type === "payment_intent.payment_failed"
              ? "failed"
              : event.type === "payment_intent.canceled"
                ? "canceled"
                : paymentIntent.status;
          await matches.docs[0].ref.update({
            status,
            updatedAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
          });
        }
      }
      await eventRef.set({
        type: event.type,
        providerCreatedAt: event.created || null,
        processedAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
      });
      response.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook failed", { name: error?.name, message: error?.message });
      response.status(400).send("Webhook failed");
    }
  },
);
exports.placeAutocomplete = onCall(
  { enforceAppCheck: false, secrets: [mapsSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    const query = String(request.data?.query || "").trim();
    if (query.length < 2 || query.length > 120) throw new HttpsError("invalid-argument", "query is invalid");
    const key = mapsSecret.value();
    if (!key) throw new HttpsError("failed-precondition", "maps provider is not configured");
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ input: query, languageCode: request.data?.languageCode || "fr" }),
    });
    if (!response.ok) throw new HttpsError("unavailable", "places provider failed");
    const result = await response.json();
    return {
      suggestions: (result.suggestions || []).slice(0, 8).map((item) => ({
        placeId: item.placePrediction?.placeId || "",
        label: item.placePrediction?.text?.text || "",
      })),
    };
  },
);

exports.resolvePlace = onCall(
  { enforceAppCheck: false, secrets: [mapsSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    const placeId = String(request.data?.placeId || "").trim();
    if (!placeId) throw new HttpsError("invalid-argument", "placeId is required");
    const key = mapsSecret.value();
    if (!key) throw new HttpsError("failed-precondition", "maps provider is not configured");
    const response = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
        "Accept-Language": request.data?.languageCode || "fr",
      },
    });
    if (!response.ok) throw new HttpsError("unavailable", "places provider failed");
    const place = await response.json();
    return {
      placeId: place.id || placeId,
      label: place.formattedAddress || place.displayName?.text || "",
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
    };
  },
);

exports.computeRoute = onCall(
  { enforceAppCheck: false, secrets: [mapsSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    const origin = request.data?.origin;
    const destination = request.data?.destination;
    for (const point of [origin, destination]) {
      if (typeof point?.latitude !== "number" || typeof point?.longitude !== "number") {
        throw new HttpsError("invalid-argument", "route coordinates are invalid");
      }
    }
    const key = mapsSecret.value();
    if (!key) throw new HttpsError("failed-precondition", "maps provider is not configured");
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!response.ok) throw new HttpsError("unavailable", "routes provider failed");
    const route = (await response.json()).routes?.[0];
    if (!route) throw new HttpsError("not-found", "route not found");
    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: Number(String(route.duration || "0s").replace("s", "")),
      encodedPolyline: route.polyline?.encodedPolyline || "",
    };
  },
);
exports.registerDeviceToken = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await registerDeviceToken(getFirestore(), {
        actorId: request.auth.uid,
        token: request.data?.token,
        platform: request.data?.platform,
        locale: request.data?.locale,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.createPaymentIntent = onCall(
  { enforceAppCheck: false, secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await createPaymentIntent(getFirestore(), {
        actorId: request.auth.uid,
        bookingId: request.data?.bookingId,
      }, stripeProvider());
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.refundPayment = onCall(
  { enforceAppCheck: false, secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await refundPayment(getFirestore(), {
        actorId: request.auth.uid,
        paymentId: request.data?.paymentId,
        isAdmin: request.auth.token.platformAdmin === true,
      }, stripeProvider());
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.updateTripStatus = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await updateTripStatus(getFirestore(), {
        actorId: request.auth.uid,
        bookingId: request.data?.bookingId,
        action: request.data?.action,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.submitRating = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await submitRating(getFirestore(), { actorId: request.auth.uid, ...request.data });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.reportSafetyIssue = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await reportSafetyIssue(getFirestore(), { actorId: request.auth.uid, ...request.data });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.loadCompanyDashboard = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await loadCompanyDashboard(getFirestore(), {
        actorId: request.auth.uid,
        companyId: request.data?.companyId,
        isPlatformAdmin: request.auth.token.platformAdmin === true,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.pushNotification = onDocumentCreated(
  "users/{uid}/notifications/{notificationId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const notification = snapshot.data();
    const devices = await getFirestore().collection("users").doc(event.params.uid)
      .collection("devices").where("active", "==", true).limit(20).get();
    const tokens = devices.docs.map((document) => document.data().token).filter(Boolean);
    if (tokens.length === 0) return;
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      data: {
        type: String(notification.type || "update"),
        bookingId: String(notification.bookingId || ""),
        rideId: String(notification.rideId || ""),
        conversationId: String(notification.conversationId || ""),
      },
      android: { priority: "high" },
    });
    const invalidTokens = [];
    response.responses.forEach((result, index) => {
      if (!result.success && ["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(result.error?.code)) {
        invalidTokens.push(tokens[index]);
      }
    });
    await Promise.all(invalidTokens.map(async (token) => {
      const matches = await getFirestore().collection("users").doc(event.params.uid)
        .collection("devices").where("token", "==", token).get();
      await Promise.all(matches.docs.map((document) => document.ref.update({ active: false })));
    }));
  },
);
exports.listCompanyMembers = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await listCompanyMembers(getFirestore(), {
        actorId: request.auth.uid,
        companyId: request.data?.companyId,
        isPlatformAdmin: request.auth.token.platformAdmin === true,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.setCompanyMemberRole = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await setCompanyMemberRole(getFirestore(), {
        actorId: request.auth.uid,
        companyId: request.data?.companyId,
        userId: request.data?.userId,
        role: request.data?.role,
        isPlatformAdmin: request.auth.token.platformAdmin === true,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.listSafetyReports = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await listSafetyReports(getFirestore(), {
        isPlatformAdmin: request.auth.token.platformAdmin === true,
        status: request.data?.status,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);

exports.resolveSafetyReport = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    try {
      return await resolveSafetyReport(getFirestore(), {
        actorId: request.auth.uid,
        isPlatformAdmin: request.auth.token.platformAdmin === true,
        reportId: request.data?.reportId,
        decision: request.data?.decision,
        note: request.data?.note,
      });
    } catch (error) { throw toHttpsError(error); }
  },
);
exports.respondToBooking = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    try {
      return await respondToBooking(getFirestore(), {
        actorId: request.auth.uid,
        bookingId: request.data?.bookingId,
        decision: request.data?.decision,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

exports.sendConversationMessage = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    try {
      return await sendConversationMessage(getFirestore(), {
        actorId: request.auth.uid,
        conversationId: request.data?.conversationId,
        body: request.data?.body,
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);