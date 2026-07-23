const assert = require("node:assert/strict");
const { before, test } = require("node:test");

const { getApps, initializeApp } = require("firebase-admin/app");
const {
  FieldValue,
  getFirestore,
} = require("firebase-admin/firestore");

const {
  DomainError,
  buildOccurrenceDates,
  distanceKm,
  calculatePaymentBreakdown,
  verifyStripeSignature,
  requestBooking,
  updateTripLocation,
  createPaymentIntent,
  updateTripStatus,
  submitRating,
  reportSafetyIssue,
  listCompanyMembers,
  setCompanyMemberRole,
  listSafetyReports,
  resolveSafetyReport,
  respondToBooking,
  sendConversationMessage,
} = require("../services");

let db;

before(() => {
  if (getApps().length === 0) {
    initializeApp({ projectId: "demo-covya" });
  }
  db = getFirestore();
});

async function seedRideAndBooking(suffix, seats = 1) {
  const rideId = "ride-" + suffix;
  const bookingId = rideId + "_passenger-" + suffix;
  await db.collection("rides").doc(rideId).set({
    driverId: "driver-" + suffix,
    driverName: "Conducteur Test",
    origin: "ZUP",
    destination: "TRANE",
    departureAt: new Date(Date.now() + 86400000),
    seats,
    price: 20,
    currency: "MAD",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("bookings").doc(bookingId).set({
    rideId,
    driverId: "driver-" + suffix,
    passengerId: "passenger-" + suffix,
    seats: 1,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { rideId, bookingId };
}

test("accepting a booking is atomic and opens the conversation", async () => {
  const { rideId, bookingId } = await seedRideAndBooking("accept");
  const result = await respondToBooking(db, {
    actorId: "driver-accept",
    bookingId,
    decision: "accept",
  });

  assert.equal(result.status, "confirmed");
  const [booking, ride, conversation, notifications] = await Promise.all([
    db.collection("bookings").doc(bookingId).get(),
    db.collection("rides").doc(rideId).get(),
    db.collection("conversations").doc(bookingId).get(),
    db
      .collection("users")
      .doc("passenger-accept")
      .collection("notifications")
      .where("bookingId", "==", bookingId)
      .get(),
  ]);

  assert.equal(booking.data().status, "confirmed");
  assert.equal(ride.data().seats, 0);
  assert.equal(ride.data().status, "full");
  assert.deepEqual(conversation.data().participantIds, [
    "driver-accept",
    "passenger-accept",
  ]);
  assert.equal(notifications.size, 1);
});

test("two concurrent requests cannot take the same final seat", async () => {
  const rideId = "ride-concurrent";
  await db.collection("rides").doc(rideId).set({
    driverId: "driver-concurrent",
    driverName: "Conducteur Test",
    origin: "ZUP",
    destination: "TRANE",
    departureAt: new Date(Date.now() + 86400000),
    seats: 1,
    price: 20,
    currency: "MAD",
    status: "published",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const passengers = ["passenger-a", "passenger-b"];
  const bookingIds = passengers.map(
    (passengerId) => rideId + "_" + passengerId,
  );
  await Promise.all(
    bookingIds.map((bookingId, index) =>
      db.collection("bookings").doc(bookingId).set({
        rideId,
        driverId: "driver-concurrent",
        passengerId: passengers[index],
        seats: 1,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ),
  );

  const results = await Promise.all(
    bookingIds.map((bookingId) =>
      respondToBooking(db, {
        actorId: "driver-concurrent",
        bookingId,
        decision: "accept",
      }),
    ),
  );

  assert.deepEqual(
    results.map((result) => result.status).sort(),
    ["confirmed", "rejected"],
  );
  const ride = await db.collection("rides").doc(rideId).get();
  assert.equal(ride.data().seats, 0);
});

test("only the driver can answer a booking", async () => {
  const { bookingId } = await seedRideAndBooking("forbidden");
  await assert.rejects(
    respondToBooking(db, {
      actorId: "other-user",
      bookingId,
      decision: "accept",
    }),
    (error) =>
      error instanceof DomainError && error.code === "permission-denied",
  );
});

test("a participant can message and an outsider cannot", async () => {
  const { bookingId } = await seedRideAndBooking("message");
  await respondToBooking(db, {
    actorId: "driver-message",
    bookingId,
    decision: "accept",
  });

  const result = await sendConversationMessage(db, {
    actorId: "passenger-message",
    conversationId: bookingId,
    body: "Bonjour, je serai au point de rendez-vous.",
  });
  assert.ok(result.messageId);

  const message = await db
    .collection("conversations")
    .doc(bookingId)
    .collection("messages")
    .doc(result.messageId)
    .get();
  assert.equal(message.data().senderId, "passenger-message");

  await assert.rejects(
    sendConversationMessage(db, {
      actorId: "outsider",
      conversationId: bookingId,
      body: "Intrusion",
    }),
    (error) =>
      error instanceof DomainError && error.code === "permission-denied",
  );
});
test("recurring dates are deterministic and bounded", () => {
  const first = new Date(Date.now() + 86400000);
  const weekday = first.getUTCDay() === 0 ? 7 : first.getUTCDay();
  const dates = buildOccurrenceDates({
    firstDepartureAt: first.toISOString(),
    travelDays: [weekday],
    occurrenceCount: 5,
  });
  assert.equal(dates.length, 5);
  assert.ok(dates.every((date) => (date.getUTCDay() || 7) === weekday));
  assert.throws(
    () => buildOccurrenceDates({ firstDepartureAt: new Date(0), travelDays: [1], occurrenceCount: 1 }),
    (error) => error instanceof DomainError && error.code === "invalid-argument",
  );
});

test("geographic distance and payment breakdown are server-calculated", () => {
  const distance = distanceKm(
    { latitude: 33.5731, longitude: -7.5898 },
    { latitude: 33.5899, longitude: -7.6039 },
  );
  assert.ok(distance > 1 && distance < 5);
  assert.deepEqual(
    calculatePaymentBreakdown({
      amountMinor: 10000,
      subsidyPercent: 30,
      subsidyRemainingMinor: 2000,
    }),
    { amountMinor: 10000, subsidyMinor: 2000, passengerTotalMinor: 8000 },
  );
});

test("booking requests are created by the server with a price snapshot", async () => {
  const rideId = "ride-server-request";
  await db.collection("rides").doc(rideId).set({
    driverId: "driver-request", driverName: "Conducteur",
    origin: "A", destination: "B",
    departureAt: new Date(Date.now() + 86400000),
    seats: 2, price: 32, currency: "MAD", status: "published",
  });
  const result = await requestBooking(db, { actorId: "passenger-request", rideId });
  assert.equal(result.status, "pending");
  const booking = await db.collection("bookings").doc(result.bookingId).get();
  assert.deepEqual(booking.data().priceSnapshot, { amount: 32, currency: "MAD" });
  await assert.rejects(
    requestBooking(db, { actorId: "passenger-request", rideId }),
    (error) => error instanceof DomainError && error.code === "already-exists",
  );
});

test("live locations require a confirmed participant and expire", async () => {
  const bookingId = "booking-live";
  await db.collection("bookings").doc(bookingId).set({
    rideId: "ride-live", driverId: "driver-live",
    passengerId: "passenger-live", status: "confirmed",
  });
  const result = await updateTripLocation(db, {
    actorId: "driver-live", bookingId,
    latitude: 33.57, longitude: -7.58, accuracy: 8, sharing: true,
  });
  assert.equal(result.sharing, true);
  const location = await db.collection("trip_locations").doc(bookingId)
    .collection("participants").doc("driver-live").get();
  assert.deepEqual(location.data().participantIds, ["driver-live", "passenger-live"]);
  assert.ok(location.data().expiresAt.toMillis() > Date.now());
  await assert.rejects(
    updateTripLocation(db, {
      actorId: "outsider", bookingId,
      latitude: 33.57, longitude: -7.58, sharing: true,
    }),
    (error) => error instanceof DomainError && error.code === "permission-denied",
  );
});

test("payment intent reserves subsidy and uses an idempotent provider key", async () => {
  const bookingId = "booking-payment";
  await db.collection("users").doc("passenger-payment").set({ companyId: "company-payment" });
  await db.collection("companies").doc("company-payment").collection("budgets").doc("active").set({
    subsidyPercent: 50, remainingMinor: 3000, reservedMinor: 0,
  });
  await db.collection("bookings").doc(bookingId).set({
    rideId: "ride-payment", driverId: "driver-payment",
    passengerId: "passenger-payment", status: "confirmed",
    priceSnapshot: { amount: 100, currency: "MAD" },
  });
  const calls = [];
  const provider = {
    name: "test",
    async createIntent(input) {
      calls.push(input);
      return { id: "pi_test", clientSecret: "secret_test", status: "requires_payment_method" };
    },
  };
  const result = await createPaymentIntent(db, {
    actorId: "passenger-payment", bookingId,
  }, provider);
  assert.equal(result.breakdown.subsidyMinor, 3000);
  assert.equal(result.breakdown.passengerTotalMinor, 7000);
  assert.equal(calls[0].idempotencyKey, bookingId);
  const budget = await db.collection("companies").doc("company-payment")
    .collection("budgets").doc("active").get();
  assert.equal(budget.data().remainingMinor, 0);
});

test("trip completion unlocks one rating and a safety report", async () => {
  const bookingId = "booking-trust";
  await db.collection("bookings").doc(bookingId).set({
    rideId: "ride-trust", driverId: "driver-trust",
    passengerId: "passenger-trust", status: "confirmed",
  });
  await updateTripStatus(db, { actorId: "driver-trust", bookingId, action: "start" });
  await updateTripStatus(db, { actorId: "driver-trust", bookingId, action: "complete" });
  const rating = await submitRating(db, {
    actorId: "passenger-trust", bookingId, score: 5, tags: ["punctual"], comment: "Merci",
  });
  assert.ok(rating.ratingId);
  await assert.rejects(
    submitRating(db, { actorId: "passenger-trust", bookingId, score: 5 }),
    (error) => error instanceof DomainError && error.code === "already-exists",
  );
  const report = await reportSafetyIssue(db, {
    actorId: "passenger-trust", bookingId,
    category: "unsafe_driving", details: "Test report",
  });
  assert.equal(report.status, "open");
});
test("company managers can manage members but only platform admins moderate", async () => {
  const companyId = "company-admin-test";
  await db.collection("users").doc("manager-company").set({ fullName: "Manager", email: "manager@test.dev" });
  await db.collection("users").doc("employee-company").set({ fullName: "Employee", email: "employee@test.dev" });
  await db.collection("companies").doc(companyId).collection("members").doc("manager-company").set({
    role: "company_admin", status: "active",
  });
  await db.collection("companies").doc(companyId).collection("members").doc("employee-company").set({
    role: "employee", status: "active",
  });
  const members = await listCompanyMembers(db, {
    actorId: "manager-company", companyId, isPlatformAdmin: false,
  });
  assert.equal(members.length, 2);
  await setCompanyMemberRole(db, {
    actorId: "manager-company", companyId, userId: "employee-company",
    role: "manager", isPlatformAdmin: false,
  });
  const promoted = await db.collection("companies").doc(companyId)
    .collection("members").doc("employee-company").get();
  assert.equal(promoted.data().role, "manager");

  const reportRef = db.collection("safety_reports").doc("admin-report-test");
  await reportRef.set({
    reporterId: "employee-company", subjectId: "other",
    bookingId: "booking-admin", category: "conduct", details: "Review",
    status: "open", createdAt: FieldValue.serverTimestamp(),
  });
  await assert.rejects(
    listSafetyReports(db, { isPlatformAdmin: false, status: "open" }),
    (error) => error instanceof DomainError && error.code === "permission-denied",
  );
  const reports = await listSafetyReports(db, { isPlatformAdmin: true, status: "open" });
  assert.ok(reports.some((report) => report.id === reportRef.id));
  await resolveSafetyReport(db, {
    actorId: "platform-admin", isPlatformAdmin: true,
    reportId: reportRef.id, decision: "resolved", note: "Handled",
  });
  assert.equal((await reportRef.get()).data().status, "resolved");
});
test("Stripe webhook signatures are verified with timestamp tolerance", () => {
  const crypto = require("node:crypto");
  const secret = "whsec_test";
  const payload = JSON.stringify({ id: "evt_test", type: "payment_intent.succeeded" });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret)
    .update(timestamp + "." + payload).digest("hex");
  assert.equal(
    verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret),
    true,
  );
  assert.equal(
    verifyStripeSignature(payload + "x", `t=${timestamp},v1=${signature}`, secret),
    false,
  );
  assert.equal(
    verifyStripeSignature(payload, `t=${timestamp - 600},v1=${signature}`, secret),
    false,
  );
});