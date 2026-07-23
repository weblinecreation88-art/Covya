const { FieldValue } = require("firebase-admin/firestore");

class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainError("invalid-argument", name + " is required");
  }
  return value.trim();
}

async function respondToBooking(db, { actorId, bookingId, decision }) {
  const normalizedActorId = requireString(actorId, "actorId");
  const normalizedBookingId = requireString(bookingId, "bookingId");
  if (!["accept", "reject"].includes(decision)) {
    throw new DomainError("invalid-argument", "decision is invalid");
  }

  const bookingRef = db.collection("bookings").doc(normalizedBookingId);
  const conversationRef = db.collection("conversations").doc(normalizedBookingId);
  const systemMessageRef = conversationRef.collection("messages").doc();
  const notificationId = db.collection("_ids").doc().id;

  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) {
      throw new DomainError("not-found", "booking not found");
    }

    const booking = bookingSnapshot.data();
    if (booking.driverId !== normalizedActorId) {
      throw new DomainError("permission-denied", "driver access required");
    }
    if (booking.status !== "pending") {
      throw new DomainError("failed-precondition", "booking is already processed");
    }

    const rideRef = db.collection("rides").doc(booking.rideId);
    const rideSnapshot = await transaction.get(rideRef);
    if (!rideSnapshot.exists) {
      throw new DomainError("not-found", "ride not found");
    }
    const ride = rideSnapshot.data();
    if (ride.driverId !== normalizedActorId) {
      throw new DomainError("permission-denied", "ride owner mismatch");
    }

    const now = FieldValue.serverTimestamp();
    const passengerNotificationRef = db
      .collection("users")
      .doc(booking.passengerId)
      .collection("notifications")
      .doc(notificationId);

    if (decision === "reject") {
      transaction.update(bookingRef, {
        status: "rejected",
        responseReason: "driver_rejected",
        respondedAt: now,
        updatedAt: now,
      });
      transaction.set(passengerNotificationRef, {
        userId: booking.passengerId,
        type: "booking_rejected",
        titleKey: "bookingRejectedNotificationTitle",
        bodyKey: "bookingRejectedNotificationBody",
        bookingId: bookingSnapshot.id,
        rideId: booking.rideId,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { status: "rejected", conversationId: null };
    }

    const requestedSeats = Number(booking.seats ?? 1);
    const availableSeats = Number(ride.seats ?? 0);
    if (availableSeats < requestedSeats || ride.status !== "published") {
      transaction.update(bookingRef, {
        status: "rejected",
        responseReason: "ride_full",
        respondedAt: now,
        updatedAt: now,
      });
      transaction.set(passengerNotificationRef, {
        userId: booking.passengerId,
        type: "booking_rejected",
        titleKey: "bookingUnavailableNotificationTitle",
        bodyKey: "bookingUnavailableNotificationBody",
        bookingId: bookingSnapshot.id,
        rideId: booking.rideId,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { status: "rejected", conversationId: null };
    }

    const remainingSeats = availableSeats - requestedSeats;
    transaction.update(rideRef, {
      seats: remainingSeats,
      status: remainingSeats === 0 ? "full" : "published",
      updatedAt: now,
    });
    transaction.update(bookingRef, {
      status: "confirmed",
      respondedAt: now,
      updatedAt: now,
    });
    transaction.set(conversationRef, {
      bookingId: bookingSnapshot.id,
      rideId: booking.rideId,
      participantIds: [booking.driverId, booking.passengerId],
      status: "active",
      lastMessage: {
        senderId: "system",
        type: "system",
        body: "",
        bodyKey: "bookingConfirmedSystemMessage",
      },
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    transaction.set(systemMessageRef, {
      senderId: "system",
      type: "system",
      body: "",
      bodyKey: "bookingConfirmedSystemMessage",
      sentAt: now,
    });
    transaction.set(passengerNotificationRef, {
      userId: booking.passengerId,
      type: "booking_confirmed",
      titleKey: "bookingConfirmedNotificationTitle",
      bodyKey: "bookingConfirmedNotificationBody",
      bookingId: bookingSnapshot.id,
      rideId: booking.rideId,
      conversationId: conversationRef.id,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return { status: "confirmed", conversationId: conversationRef.id };
  });
}

async function sendConversationMessage(
  db,
  { actorId, conversationId, body },
) {
  const normalizedActorId = requireString(actorId, "actorId");
  const normalizedConversationId = requireString(conversationId, "conversationId");
  const normalizedBody = requireString(body, "body");
  if (normalizedBody.length > 1000) {
    throw new DomainError("invalid-argument", "message is too long");
  }

  const conversationRef = db.collection("conversations").doc(normalizedConversationId);
  const messageRef = conversationRef.collection("messages").doc();
  const notificationId = db.collection("_ids").doc().id;

  return db.runTransaction(async (transaction) => {
    const conversationSnapshot = await transaction.get(conversationRef);
    if (!conversationSnapshot.exists) {
      throw new DomainError("not-found", "conversation not found");
    }
    const conversation = conversationSnapshot.data();
    if (!conversation.participantIds?.includes(normalizedActorId)) {
      throw new DomainError("permission-denied", "conversation access required");
    }
    if (conversation.status !== "active") {
      throw new DomainError("failed-precondition", "conversation is read-only");
    }

    const recipientId = conversation.participantIds.find(
      (participantId) => participantId !== normalizedActorId,
    );
    if (!recipientId) {
      throw new DomainError("failed-precondition", "recipient not found");
    }

    const now = FieldValue.serverTimestamp();
    transaction.set(messageRef, {
      senderId: normalizedActorId,
      type: "text",
      body: normalizedBody,
      bodyKey: null,
      sentAt: now,
    });
    transaction.update(conversationRef, {
      lastMessage: {
        senderId: normalizedActorId,
        type: "text",
        body: normalizedBody.slice(0, 120),
        bodyKey: null,
      },
      lastMessageAt: now,
      updatedAt: now,
    });
    transaction.set(
      db
        .collection("users")
        .doc(recipientId)
        .collection("notifications")
        .doc(notificationId),
      {
        userId: recipientId,
        type: "new_message",
        titleKey: "newMessageNotificationTitle",
        bodyKey: "newMessageNotificationBody",
        conversationId: conversationSnapshot.id,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      },
    );

    return { messageId: messageRef.id };
  });
}

module.exports = {
  DomainError,
  respondToBooking,
  sendConversationMessage,
};