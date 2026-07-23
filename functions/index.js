const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

const {
  DomainError,
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