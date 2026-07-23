const assert = require("node:assert/strict");
const { before, test } = require("node:test");

const { getApps, initializeApp } = require("firebase-admin/app");
const {
  FieldValue,
  getFirestore,
} = require("firebase-admin/firestore");

const {
  DomainError,
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