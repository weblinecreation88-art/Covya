import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const projectId = 'demo-covya';
let testEnv;

function employeeDocument(uid, email) {
  return {
    uid,
    fullName: 'Employé Test',
    email,
    phone: '0600000000',
    role: 'employee',
    onboardingStatus: 'profile',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test('an employee can create and update only their own profile', async () => {
  const uid = 'employee-1';
  const email = 'employee@example.com';
  const db = testEnv.authenticatedContext(uid, { email }).firestore();
  const user = doc(db, 'users', uid);

  await assertSucceeds(setDoc(user, employeeDocument(uid, email)));
  await assertSucceeds(
    setDoc(
      user,
      {
        homeAddress: '10 rue de Paris',
        jobTitle: 'Développeur',
        onboardingStatus: 'company',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
  await assertSucceeds(getDoc(user));

  await assertFails(
    setDoc(
      user,
      {
        role: 'admin',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
});

test('an employee cannot create another user profile', async () => {
  const db = testEnv
    .authenticatedContext('employee-1', { email: 'employee@example.com' })
    .firestore();

  await assertFails(
    setDoc(
      doc(db, 'users', 'employee-2'),
      employeeDocument('employee-2', 'employee@example.com'),
    ),
  );
});

test('the Flutter company onboarding batch is accepted', async () => {
  const uid = 'employee-1';
  const email = 'employee@example.com';
  const db = testEnv.authenticatedContext(uid, { email }).firestore();
  const user = doc(db, 'users', uid);
  await assertSucceeds(setDoc(user, employeeDocument(uid, email)));

  const company = doc(db, 'companies', 'company-1');
  const batch = writeBatch(db);
  batch.set(company, {
    name: 'Covya',
    normalizedName: 'covya',
    workSite: 'Paris',
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(company, 'members', uid), {
    userId: uid,
    role: 'employee',
    status: 'active',
    joinedAt: serverTimestamp(),
  });
  batch.set(
    user,
    {
      companyId: company.id,
      companyName: 'Covya',
      workSite: 'Paris',
      onboardingStatus: 'commute',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await assertSucceeds(batch.commit());
});

test('an employee can create their own ride template only', async () => {
  const uid = 'employee-1';
  const db = testEnv
    .authenticatedContext(uid, { email: 'employee@example.com' })
    .firestore();
  const payload = {
    ownerId: uid,
    departure: 'Paris 15e',
    destination: 'La Défense',
    departureTime: '08:00',
    travelDays: ['lun', 'mar', 'mer', 'jeu', 'ven'],
    rideRole: 'passenger',
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertSucceeds(
    setDoc(doc(db, 'ride_templates', uid + '_primary'), payload),
  );
  await assertFails(
    setDoc(doc(db, 'ride_templates', 'other_primary'), {
      ...payload,
      ownerId: 'other',
    }),
  );
});

test('a passenger can request a real ride but cannot confirm it', async () => {
  const driverId = 'driver-1';
  const passengerId = 'passenger-1';
  const driverDb = testEnv
    .authenticatedContext(driverId, { email: 'driver@example.com' })
    .firestore();
  const passengerDb = testEnv
    .authenticatedContext(passengerId, { email: 'passenger@example.com' })
    .firestore();
  const ride = doc(driverDb, 'rides', 'ride-1');

  await assertSucceeds(
    setDoc(ride, {
      driverId,
      driverName: 'Conducteur Test',
      origin: 'Paris',
      destination: 'La Défense',
      departureAt: new Date(Date.now() + 86400000),
      seats: 3,
      price: 20,
      currency: 'MAD',
      status: 'published',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  const booking = doc(
    passengerDb,
    'bookings',
    'ride-1_' + passengerId,
  );
  await assertSucceeds(
    setDoc(booking, {
      rideId: 'ride-1',
      driverId,
      passengerId,
      seats: 1,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(getDoc(booking));
  await assertSucceeds(
    getDocs(
      query(
        collection(passengerDb, 'bookings'),
        where('passengerId', '==', passengerId),
      ),
    ),
  );
  await assertFails(
    setDoc(
      booking,
      {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
});

test('a passenger cannot request a missing or spoofed ride', async () => {
  const passengerId = 'passenger-1';
  const db = testEnv
    .authenticatedContext(passengerId, { email: 'passenger@example.com' })
    .firestore();

  await assertFails(
    setDoc(doc(db, 'bookings', 'missing_' + passengerId), {
      rideId: 'missing',
      driverId: 'fake-driver',
      passengerId,
      seats: 1,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('only participants can read a conversation and its messages', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'conversations', 'conversation-1'), {
      bookingId: 'booking-1',
      participantIds: ['driver-1', 'passenger-1'],
      status: 'active',
      lastMessage: {
        senderId: 'system',
        type: 'system',
        body: '',
      },
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(adminDb, 'conversations', 'conversation-1', 'messages', 'message-1'),
      {
        senderId: 'system',
        type: 'system',
        body: '',
        sentAt: serverTimestamp(),
      },
    );
  });

  const participantDb = testEnv
    .authenticatedContext('passenger-1')
    .firestore();
  const outsiderDb = testEnv.authenticatedContext('outsider').firestore();

  await assertSucceeds(
    getDocs(
      query(
        collection(participantDb, 'conversations'),
        where('participantIds', 'array-contains', 'passenger-1'),
      ),
    ),
  );
  await assertSucceeds(
    getDocs(
      collection(
        participantDb,
        'conversations',
        'conversation-1',
        'messages',
      ),
    ),
  );
  await assertFails(
    getDoc(doc(outsiderDb, 'conversations', 'conversation-1')),
  );
  await assertFails(
    setDoc(
      doc(
        participantDb,
        'conversations',
        'conversation-1',
        'messages',
        'client-message',
      ),
      {
        senderId: 'passenger-1',
        type: 'text',
        body: 'Message direct interdit',
        sentAt: serverTimestamp(),
      },
    ),
  );
});

test('a user can read and mark only their own notification', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(
      doc(adminDb, 'users', 'passenger-1', 'notifications', 'notification-1'),
      {
        userId: 'passenger-1',
        type: 'booking_confirmed',
        titleKey: 'bookingConfirmedNotificationTitle',
        bodyKey: 'bookingConfirmedNotificationBody',
        readAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    );
  });

  const ownerDb = testEnv.authenticatedContext('passenger-1').firestore();
  const outsiderDb = testEnv.authenticatedContext('outsider').firestore();
  const notification = doc(
    ownerDb,
    'users',
    'passenger-1',
    'notifications',
    'notification-1',
  );

  await assertSucceeds(getDoc(notification));
  await assertSucceeds(
    setDoc(
      notification,
      {
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
  await assertFails(
    getDoc(
      doc(
        outsiderDb,
        'users',
        'passenger-1',
        'notifications',
        'notification-1',
      ),
    ),
  );
  await assertFails(
    setDoc(
      notification,
      {
        type: 'tampered',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
});

test('the existing web user schema remains accepted', async () => {
  const uid = 'web-user';
  const email = 'web@example.com';
  const db = testEnv.authenticatedContext(uid, { email }).firestore();

  await assertSucceeds(
    setDoc(doc(db, 'users', uid), {
      uid,
      displayName: 'Web User',
      email,
      phone: '0600000000',
      accountType: 'employee',
      mobilityRole: 'passenger',
      companyName: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});