const { FieldValue, Timestamp } = require("firebase-admin/firestore");

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

function requireCoordinate(value, name) {
  if (!value || typeof value !== "object" ||
      typeof value.latitude !== "number" || typeof value.longitude !== "number" ||
      value.latitude < -90 || value.latitude > 90 ||
      value.longitude < -180 || value.longitude > 180) {
    throw new DomainError("invalid-argument", name + " is invalid");
  }
  return {
    label: requireString(value.label, name + ".label").slice(0, 180),
    placeId: typeof value.placeId === "string" ? value.placeId.slice(0, 180) : "",
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function distanceKm(left, right) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const latitudeA = toRadians(left.latitude);
  const latitudeB = toRadians(right.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildOccurrenceDates({ firstDepartureAt, travelDays, occurrenceCount }) {
  const first = new Date(firstDepartureAt);
  if (Number.isNaN(first.getTime()) || first.getTime() <= Date.now()) {
    throw new DomainError("invalid-argument", "firstDepartureAt is invalid");
  }
  const normalizedDays = [...new Set(travelDays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort();
  if (normalizedDays.length === 0) {
    throw new DomainError("invalid-argument", "travelDays is invalid");
  }
  const count = Math.min(Math.max(Number(occurrenceCount) || 1, 1), 40);
  const dates = [];
  const cursor = new Date(first);
  for (let offset = 0; offset < 180 && dates.length < count; offset += 1) {
    const isoWeekday = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    if (normalizedDays.includes(isoWeekday)) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function publishRideSeries(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const driverName = requireString(input.driverName, "driverName").slice(0, 80);
  const origin = requireCoordinate(input.origin, "origin");
  const destination = requireCoordinate(input.destination, "destination");
  const seats = Number(input.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
    throw new DomainError("invalid-argument", "seats is invalid");
  }
  const travelDays = Array.isArray(input.travelDays) ? input.travelDays : [];
  const occurrences = buildOccurrenceDates({
    firstDepartureAt: input.firstDepartureAt,
    travelDays,
    occurrenceCount: input.occurrenceCount,
  });
  const directDistanceKm = distanceKm(origin, destination);
  if (directDistanceKm < 0.2 || directDistanceKm > 250) {
    throw new DomainError("invalid-argument", "route distance is unsupported");
  }
  const price = Math.max(0, Math.round(directDistanceKm * 1.2));
  const userSnapshot = await db.collection("users").doc(actorId).get();
  const companyId = userSnapshot.data()?.companyId || null;
  const seriesRef = db.collection("ride_series").doc();
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  batch.set(seriesRef, {
    ownerId: actorId, companyId, origin, destination,
    travelDays: [...new Set(travelDays)].sort(),
    seats, currency: "MAD", price, active: true,
    createdAt: now, updatedAt: now,
  });
  const rideIds = [];
  for (const departureAt of occurrences) {
    const rideRef = db.collection("rides").doc();
    rideIds.push(rideRef.id);
    batch.set(rideRef, {
      seriesId: seriesRef.id, companyId, driverId: actorId, driverName,
      origin: origin.label, destination: destination.label,
      originLocation: origin, destinationLocation: destination,
      departureAt: Timestamp.fromDate(departureAt),
      seats, initialSeats: seats, price, currency: "MAD", status: "published",
      createdAt: now, updatedAt: now,
    });
  }
  await batch.commit();
  return {
    seriesId: seriesRef.id, rideIds, price, currency: "MAD",
    directDistanceKm: Number(directDistanceKm.toFixed(1)),
  };
}

async function searchRideMatches(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const origin = requireCoordinate(input.origin, "origin");
  const destination = requireCoordinate(input.destination, "destination");
  const earliest = new Date(input.earliestDepartureAt);
  const latest = new Date(input.latestDepartureAt);
  if (Number.isNaN(earliest.getTime()) || Number.isNaN(latest.getTime()) ||
      latest <= earliest || latest.getTime() - earliest.getTime() > 7 * 86400000) {
    throw new DomainError("invalid-argument", "departure window is invalid");
  }
  const snapshot = await db.collection("rides")
    .where("status", "==", "published")
    .where("departureAt", ">=", Timestamp.fromDate(earliest))
    .where("departureAt", "<=", Timestamp.fromDate(latest))
    .limit(100).get();
  return snapshot.docs.map((document) => {
    const ride = document.data();
    if (ride.driverId === actorId || !ride.originLocation ||
        !ride.destinationLocation || Number(ride.seats || 0) < 1) return null;
    const originDistanceKm = distanceKm(origin, ride.originLocation);
    const destinationDistanceKm = distanceKm(destination, ride.destinationLocation);
    if (originDistanceKm > 8 || destinationDistanceKm > 8) return null;
    return {
      id: document.id, driverId: ride.driverId, driverName: ride.driverName,
      origin: ride.origin, destination: ride.destination,
      originLocation: ride.originLocation, destinationLocation: ride.destinationLocation,
      departureAt: ride.departureAt.toDate().toISOString(), seats: ride.seats,
      price: ride.price, currency: ride.currency,
      score: Math.max(0, Math.round(100 - originDistanceKm * 5 - destinationDistanceKm * 5)),
      originDistanceKm: Number(originDistanceKm.toFixed(1)),
      destinationDistanceKm: Number(destinationDistanceKm.toFixed(1)),
      reasons: [originDistanceKm <= 2 ? "near_origin" : "acceptable_origin",
        destinationDistanceKm <= 2 ? "near_destination" : "acceptable_destination",
        "departure_window", "seats_available"],
    };
  }).filter(Boolean).sort((left, right) => right.score - left.score);
}

async function requestBooking(db, { actorId, rideId }) {
  const normalizedActorId = requireString(actorId, "actorId");
  const normalizedRideId = requireString(rideId, "rideId");
  const rideRef = db.collection("rides").doc(normalizedRideId);
  const bookingRef = db.collection("bookings").doc(normalizedRideId + "_" + normalizedActorId);
  return db.runTransaction(async (transaction) => {
    const rideSnapshot = await transaction.get(rideRef);
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!rideSnapshot.exists) throw new DomainError("not-found", "ride not found");
    if (bookingSnapshot.exists) throw new DomainError("already-exists", "booking already exists");
    const ride = rideSnapshot.data();
    if (ride.driverId === normalizedActorId || ride.status !== "published" ||
        Number(ride.seats || 0) < 1 || ride.departureAt.toMillis() <= Date.now()) {
      throw new DomainError("failed-precondition", "ride is unavailable");
    }
    const now = FieldValue.serverTimestamp();
    transaction.set(bookingRef, {
      rideId: normalizedRideId, driverId: ride.driverId,
      passengerId: normalizedActorId, seats: 1, status: "pending",
      priceSnapshot: { amount: Number(ride.price || 0), currency: ride.currency || "MAD" },
      createdAt: now, updatedAt: now,
    });
    return { bookingId: bookingRef.id, status: "pending" };
  });
}

async function updateTripLocation(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const bookingId = requireString(input.bookingId, "bookingId");
  const coordinate = requireCoordinate({
    label: "live", latitude: input.latitude, longitude: input.longitude,
  }, "location");
  const bookingSnapshot = await db.collection("bookings").doc(bookingId).get();
  if (!bookingSnapshot.exists) throw new DomainError("not-found", "booking not found");
  const booking = bookingSnapshot.data();
  if (![booking.driverId, booking.passengerId].includes(actorId) ||
      booking.status !== "confirmed") {
    throw new DomainError("permission-denied", "confirmed participant required");
  }
  const locationRef = db.collection("trip_locations").doc(bookingId)
    .collection("participants").doc(actorId);
  if (input.sharing === false) {
    await locationRef.delete();
    return { sharing: false };
  }
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await locationRef.set({
    bookingId, userId: actorId,
    participantIds: [booking.driverId, booking.passengerId],
    latitude: coordinate.latitude, longitude: coordinate.longitude,
    accuracy: typeof input.accuracy === "number" ?
      Math.max(0, Math.min(input.accuracy, 1000)) : null,
    updatedAt: FieldValue.serverTimestamp(), expiresAt,
  });
  return { sharing: true, expiresAt: expiresAt.toDate().toISOString() };
}
function verifyStripeSignature(payload, signatureHeader, secret, nowMs = Date.now()) {
  if (typeof payload !== "string" || typeof signatureHeader !== "string" || !secret) {
    return false;
  }
  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || Math.abs(nowMs / 1000 - timestamp) > 300) {
    return false;
  }
  const crypto = require("node:crypto");
  const actual = crypto.createHmac("sha256", secret)
    .update(timestamp + "." + payload).digest();
  return signatures.some((signature) => {
    try {
      const expected = Buffer.from(signature, "hex");
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch (_) {
      return false;
    }
  });
}
function calculatePaymentBreakdown({ amountMinor, subsidyPercent, subsidyRemainingMinor }) {
  const normalizedAmount = Math.max(0, Math.round(Number(amountMinor) || 0));
  const normalizedPercent = Math.max(0, Math.min(Number(subsidyPercent) || 0, 100));
  const normalizedRemaining = Math.max(0, Math.round(Number(subsidyRemainingMinor) || 0));
  const requestedSubsidy = Math.round(normalizedAmount * normalizedPercent / 100);
  const subsidyMinor = Math.min(requestedSubsidy, normalizedRemaining);
  return {
    amountMinor: normalizedAmount,
    subsidyMinor,
    passengerTotalMinor: normalizedAmount - subsidyMinor,
  };
}

async function registerDeviceToken(db, { actorId, token, platform, locale }) {
  const normalizedActorId = requireString(actorId, "actorId");
  const normalizedToken = requireString(token, "token");
  if (normalizedToken.length > 4096) {
    throw new DomainError("invalid-argument", "token is too long");
  }
  const deviceId = require("node:crypto")
    .createHash("sha256").update(normalizedToken).digest("hex");
  await db.collection("users").doc(normalizedActorId)
    .collection("devices").doc(deviceId).set({
      userId: normalizedActorId,
      token: normalizedToken,
      platform: ["android", "ios", "web"].includes(platform) ? platform : "unknown",
      locale: ["fr", "en", "ar"].includes(locale) ? locale : "fr",
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  return { registered: true };
}

async function createPaymentIntent(db, input, paymentProvider) {
  const actorId = requireString(input.actorId, "actorId");
  const bookingId = requireString(input.bookingId, "bookingId");
  const bookingRef = db.collection("bookings").doc(bookingId);
  const paymentRef = db.collection("payments").doc(bookingId);
  const bookingSnapshot = await bookingRef.get();
  if (!bookingSnapshot.exists) throw new DomainError("not-found", "booking not found");
  const booking = bookingSnapshot.data();
  if (booking.passengerId !== actorId || booking.status !== "confirmed") {
    throw new DomainError("permission-denied", "confirmed passenger required");
  }
  const existing = await paymentRef.get();
  if (existing.exists) {
    const data = existing.data();
    return { paymentId: existing.id, status: data.status,
      clientSecret: data.clientSecret || null, breakdown: data.breakdown };
  }
  const userSnapshot = await db.collection("users").doc(actorId).get();
  const companyId = userSnapshot.data()?.companyId || null;
  const budgetRef = companyId ?
    db.collection("companies").doc(companyId).collection("budgets").doc("active") : null;
  const budgetSnapshot = budgetRef ? await budgetRef.get() : null;
  const priceSnapshot = booking.priceSnapshot || {};
  const breakdown = calculatePaymentBreakdown({
    amountMinor: Math.round(Number(priceSnapshot.amount || 0) * 100),
    subsidyPercent: budgetSnapshot?.data()?.subsidyPercent || 0,
    subsidyRemainingMinor: budgetSnapshot?.data()?.remainingMinor || 0,
  });
  const providerResult = breakdown.passengerTotalMinor === 0
    ? {
        id: "subsidy_" + bookingId,
        clientSecret: null,
        status: "succeeded",
        providerName: "company_subsidy",
      }
    : await paymentProvider.createIntent({
        amountMinor: breakdown.passengerTotalMinor,
        currency: String(priceSnapshot.currency || "MAD").toLowerCase(),
        idempotencyKey: bookingId,
        metadata: { bookingId, passengerId: actorId, companyId: companyId || "" },
      });
  await db.runTransaction(async (transaction) => {
    const currentPayment = await transaction.get(paymentRef);
    if (currentPayment.exists) return;
    if (budgetRef && breakdown.subsidyMinor > 0) {
      const currentBudget = await transaction.get(budgetRef);
      const remainingMinor = Number(currentBudget.data()?.remainingMinor || 0);
      if (remainingMinor < breakdown.subsidyMinor) {
        throw new DomainError("aborted", "subsidy budget changed");
      }
      transaction.update(budgetRef, {
        remainingMinor: remainingMinor - breakdown.subsidyMinor,
        reservedMinor: FieldValue.increment(breakdown.subsidyMinor),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.set(paymentRef, {
      bookingId, passengerId: actorId, driverId: booking.driverId,
      companyId, provider: providerResult.providerName || paymentProvider.name,
      providerPaymentId: providerResult.id,
      clientSecret: providerResult.clientSecret || null,
      status: providerResult.status,
      breakdown, currency: String(priceSnapshot.currency || "MAD"),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { paymentId: paymentRef.id, status: providerResult.status,
    clientSecret: providerResult.clientSecret || null, breakdown };
}

async function refundPayment(db, input, paymentProvider) {
  const actorId = requireString(input.actorId, "actorId");
  const paymentId = requireString(input.paymentId, "paymentId");
  const paymentRef = db.collection("payments").doc(paymentId);
  const paymentSnapshot = await paymentRef.get();
  if (!paymentSnapshot.exists) throw new DomainError("not-found", "payment not found");
  const payment = paymentSnapshot.data();
  if (payment.passengerId !== actorId && input.isAdmin !== true) {
    throw new DomainError("permission-denied", "payment owner required");
  }
  if (!["succeeded", "captured"].includes(payment.status)) {
    throw new DomainError("failed-precondition", "payment is not refundable");
  }
  const result = payment.provider === "company_subsidy"
    ? { id: "subsidy_refund_" + paymentId, status: "succeeded" }
    : await paymentProvider.refund({
        paymentId: payment.providerPaymentId,
        idempotencyKey: paymentId + "_refund",
      });
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(paymentRef);
    if (current.data()?.status === "refunded") return;
    transaction.update(paymentRef, {
      status: result.status === "succeeded" ? "refunded" : "refund_pending",
      providerRefundId: result.id,
      refundedAt: result.status === "succeeded" ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const subsidyMinor = Number(payment.breakdown?.subsidyMinor || 0);
    if (result.status === "succeeded" && payment.companyId && subsidyMinor > 0) {
      const budgetRef = db.collection("companies").doc(payment.companyId)
        .collection("budgets").doc("active");
      transaction.update(budgetRef, {
        remainingMinor: FieldValue.increment(subsidyMinor),
        reservedMinor: FieldValue.increment(-subsidyMinor),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  return { paymentId, status: result.status };
}

async function updateTripStatus(db, { actorId, bookingId, action }) {
  const normalizedActorId = requireString(actorId, "actorId");
  const normalizedBookingId = requireString(bookingId, "bookingId");
  const bookingRef = db.collection("bookings").doc(normalizedBookingId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists) throw new DomainError("not-found", "booking not found");
    const booking = snapshot.data();
    const isDriver = booking.driverId === normalizedActorId;
    const isPassenger = booking.passengerId === normalizedActorId;
    if (!isDriver && !isPassenger) throw new DomainError("permission-denied", "participant required");
    const now = FieldValue.serverTimestamp();
    if (action === "check_in" && isPassenger && booking.status === "confirmed") {
      transaction.update(bookingRef, { passengerCheckedInAt: now, updatedAt: now });
      return { status: booking.status, checkedIn: true };
    }
    if (action === "start" && isDriver && booking.status === "confirmed") {
      transaction.update(bookingRef, { status: "active", startedAt: now, updatedAt: now });
      return { status: "active" };
    }
    if (action === "complete" && isDriver && booking.status === "active") {
      transaction.update(bookingRef, { status: "completed", completedAt: now, updatedAt: now });
      return { status: "completed" };
    }
    throw new DomainError("failed-precondition", "trip transition is invalid");
  });
}

async function submitRating(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const bookingId = requireString(input.bookingId, "bookingId");
  const score = Number(input.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new DomainError("invalid-argument", "score is invalid");
  }
  const bookingSnapshot = await db.collection("bookings").doc(bookingId).get();
  if (!bookingSnapshot.exists) throw new DomainError("not-found", "booking not found");
  const booking = bookingSnapshot.data();
  if (booking.status !== "completed" ||
      ![booking.driverId, booking.passengerId].includes(actorId)) {
    throw new DomainError("permission-denied", "completed participant required");
  }
  const subjectId = actorId === booking.driverId ? booking.passengerId : booking.driverId;
  const ratingRef = db.collection("ratings").doc(bookingId + "_" + actorId);
  if ((await ratingRef.get()).exists) throw new DomainError("already-exists", "rating already submitted");
  await ratingRef.set({
    bookingId, rideId: booking.rideId, authorId: actorId, subjectId, score,
    tags: Array.isArray(input.tags) ? input.tags.slice(0, 5) : [],
    comment: typeof input.comment === "string" ? input.comment.trim().slice(0, 500) : "",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ratingId: ratingRef.id };
}

async function reportSafetyIssue(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const bookingId = requireString(input.bookingId, "bookingId");
  const category = requireString(input.category, "category");
  const bookingSnapshot = await db.collection("bookings").doc(bookingId).get();
  if (!bookingSnapshot.exists) throw new DomainError("not-found", "booking not found");
  const booking = bookingSnapshot.data();
  if (![booking.driverId, booking.passengerId].includes(actorId)) {
    throw new DomainError("permission-denied", "participant required");
  }
  const reportRef = db.collection("safety_reports").doc();
  await reportRef.set({
    reporterId: actorId, bookingId, rideId: booking.rideId,
    subjectId: actorId === booking.driverId ? booking.passengerId : booking.driverId,
    category: category.slice(0, 80),
    details: typeof input.details === "string" ? input.details.trim().slice(0, 2000) : "",
    status: "open", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return { reportId: reportRef.id, status: "open" };
}

async function loadCompanyDashboard(db, { actorId, companyId, isPlatformAdmin }) {
  const normalizedActorId = requireString(actorId, "actorId");
  const normalizedCompanyId = requireString(companyId, "companyId");
  if (!isPlatformAdmin) {
    const membership = await db.collection("companies").doc(normalizedCompanyId)
      .collection("members").doc(normalizedActorId).get();
    if (!membership.exists || !["company_admin", "manager"].includes(membership.data().role)) {
      throw new DomainError("permission-denied", "company manager required");
    }
  }
  const [members, users, rides, payments, reports] = await Promise.all([
    db.collection("companies").doc(normalizedCompanyId).collection("members").get(),
    db.collection("users").where("companyId", "==", normalizedCompanyId).get(),
    db.collection("rides").where("companyId", "==", normalizedCompanyId).get(),
    db.collection("payments").where("companyId", "==", normalizedCompanyId).get(),
    isPlatformAdmin ? db.collection("safety_reports").where("status", "==", "open").get() : Promise.resolve({ size: 0 }),
  ]);
  const subsidyMinor = payments.docs.reduce((total, doc) =>
    total + Number(doc.data().breakdown?.subsidyMinor || 0), 0);
  return {
    memberCount: Math.max(members.size, users.size),
    rideCount: rides.size,
    paymentCount: payments.size,
    subsidyMinor,
    openReportCount: reports.size,
    generatedAt: new Date().toISOString(),
  };
}
async function requireCompanyManager(db, { actorId, companyId, isPlatformAdmin }) {
  if (isPlatformAdmin) return;
  const membership = await db.collection("companies").doc(companyId)
    .collection("members").doc(actorId).get();
  if (!membership.exists || !["company_admin", "manager"].includes(membership.data().role)) {
    throw new DomainError("permission-denied", "company manager required");
  }
}

async function listCompanyMembers(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const companyId = requireString(input.companyId, "companyId");
  await requireCompanyManager(db, {
    actorId, companyId, isPlatformAdmin: input.isPlatformAdmin === true,
  });
  const members = await db.collection("companies").doc(companyId)
    .collection("members").limit(200).get();
  return Promise.all(members.docs.map(async (document) => {
    const user = await db.collection("users").doc(document.id).get();
    return {
      userId: document.id,
      displayName: user.data()?.fullName || user.data()?.displayName || "",
      email: user.data()?.email || "",
      role: document.data().role || "employee",
      status: document.data().status || "active",
    };
  }));
}

async function setCompanyMemberRole(db, input) {
  const actorId = requireString(input.actorId, "actorId");
  const companyId = requireString(input.companyId, "companyId");
  const userId = requireString(input.userId, "userId");
  const role = requireString(input.role, "role");
  await requireCompanyManager(db, {
    actorId, companyId, isPlatformAdmin: input.isPlatformAdmin === true,
  });
  const allowed = input.isPlatformAdmin === true
    ? ["employee", "manager", "company_admin"]
    : ["employee", "manager"];
  if (!allowed.includes(role)) {
    throw new DomainError("permission-denied", "role transition is not allowed");
  }
  const memberRef = db.collection("companies").doc(companyId)
    .collection("members").doc(userId);
  if (!(await memberRef.get()).exists) throw new DomainError("not-found", "member not found");
  await memberRef.update({ role, updatedAt: FieldValue.serverTimestamp() });
  return { userId, role };
}

async function listSafetyReports(db, { isPlatformAdmin, status }) {
  if (!isPlatformAdmin) throw new DomainError("permission-denied", "platform admin required");
  const normalizedStatus = ["open", "reviewing", "resolved", "dismissed"].includes(status)
    ? status : "open";
  const reports = await db.collection("safety_reports")
    .where("status", "==", normalizedStatus).limit(100).get();
  return reports.docs.map((document) => ({
    id: document.id,
    reporterId: document.data().reporterId,
    subjectId: document.data().subjectId,
    bookingId: document.data().bookingId,
    category: document.data().category,
    details: document.data().details,
    status: document.data().status,
    createdAt: document.data().createdAt?.toDate()?.toISOString() || null,
  }));
}

async function resolveSafetyReport(db, input) {
  if (input.isPlatformAdmin !== true) {
    throw new DomainError("permission-denied", "platform admin required");
  }
  const reportId = requireString(input.reportId, "reportId");
  const decision = requireString(input.decision, "decision");
  if (!["reviewing", "resolved", "dismissed"].includes(decision)) {
    throw new DomainError("invalid-argument", "decision is invalid");
  }
  const reportRef = db.collection("safety_reports").doc(reportId);
  if (!(await reportRef.get()).exists) throw new DomainError("not-found", "report not found");
  await reportRef.update({
    status: decision,
    decisionNote: typeof input.note === "string" ? input.note.trim().slice(0, 1000) : "",
    decidedBy: input.actorId,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { reportId, status: decision };
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
  buildOccurrenceDates,
  distanceKm,
  calculatePaymentBreakdown,
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
};