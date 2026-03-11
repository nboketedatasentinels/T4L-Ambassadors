// ============================================
// IMPACT LOG SYNC SERVICE
// Bidirectional sync between Supabase (Ambassadors) and Firestore (Tier).
// Identity key: email + phone_number → resolves to the same user on both platforms.
// ============================================

const firebaseAdmin = require("firebase-admin");

const isDev = process.env.NODE_ENV !== "production";
const log = (...args) => { if (isDev) console.log(...args); };

function getFirestore() {
  try {
    return firebaseAdmin.firestore();
  } catch {
    return null;
  }
}

// ============================================
// SCHEMA MAPPING: Supabase ↔ Firestore
// Supabase uses snake_case, Firestore uses camelCase
// ============================================

function supabaseEntryToFirestore(entry, firebaseUid) {
  return {
    sourceEntryId: String(entry.entry_id),
    sourcePlatform: "t4l_ambassadors",
    userId: firebaseUid,
    entryType: entry.entry_type || "individual",
    categoryGroup: entry.impact_type === "business" ? "business" : "esg",
    title: entry.title || "Impact Activity",
    description: entry.description || "",
    esgCategory: entry.esg_category || "environmental",
    peopleImpacted: parseFloat(entry.people_impacted) || 0,
    hours: parseFloat(entry.hours_contributed) || 0,
    usdValue: parseFloat(entry.usd_value) || 0,
    date: entry.activity_date || new Date().toISOString().slice(0, 10),
    verificationLevel: entry.verification_level || "Tier 1: Self-Reported",
    verificationMultiplier: parseFloat(entry.verification_multiplier) || 1.0,
    evidenceLink: entry.evidence_link || null,
    scp: parseFloat(entry.scp_earned) || 0,
    points: parseInt(entry.points_earned) || 0,
    impactValue: parseFloat(entry.impact_value) || 0,
    createdAt: entry.created_at ? new Date(entry.created_at).toISOString() : new Date().toISOString(),
    readOnly: true,
    syncedAt: new Date().toISOString(),
  };
}

function mapVerificationLevel(tierValue) {
  if (!tierValue) return "tier_1";
  const v = String(tierValue).toLowerCase();
  if (v.includes("4") || v.includes("third-party")) return "tier_4";
  if (v.includes("3") || v.includes("evidence")) return "tier_3";
  if (v.includes("2") || v.includes("partner")) return "tier_2";
  return "tier_1";
}

function firestoreEntryToSupabase(doc, supabaseUserId, userRole) {
  const d = doc.data ? doc.data() : doc;
  const createdAt = d.createdAt?.toDate?.()?.toISOString() || d.createdAt || new Date().toISOString();
  return {
    user_id: supabaseUserId,
    user_role: userRole || d.userRole || "ambassador",
    entry_type: d.entryType || "individual",
    impact_type: d.categoryGroup === "business" ? "business" : "esg",
    title: d.title || "Impact Activity",
    description: d.description || "",
    esg_category: d.esgCategory || "environmental",
    people_impacted: parseFloat(d.peopleImpacted) || 0,
    hours_contributed: parseFloat(d.hours) || parseFloat(d.hoursContributed) || 0,
    usd_value: parseFloat(d.usdValue) || 0,
    impact_unit: d.impactUnit || "people",
    verification_level: mapVerificationLevel(d.verificationLevel),
    verification_multiplier: parseFloat(d.verificationMultiplier) || 1.0,
    evidence_link: d.evidenceLink || null,
    scp_earned: parseFloat(d.scp) || parseFloat(d.scpEarned) || 0,
    points_earned: parseInt(d.points) || parseInt(d.pointsEarned) || 0,
    activity_date: d.date || d.activityDate || new Date().toISOString().split("T")[0],
    share_externally: false,
    source_platform: d.sourcePlatform || "transformation_tier",
    source_entry_id: doc.id || d.sourceEntryId || null,
    created_at: createdAt,
    updated_at: d.updatedAt?.toDate?.()?.toISOString() || d.updatedAt || createdAt,
  };
}

function supabaseEventToFirestore(event, firebaseUid) {
  return {
    sourceEventId: event.event_id,
    sourcePlatform: "ambassadors",
    createdBy: firebaseUid,
    creatorRole: event.creator_role || "ambassador",
    title: event.title || "",
    description: event.description || "",
    esgCategory: event.esg_category || "social",
    totalImpactValue: parseFloat(event.total_impact_value) || 0,
    impactUnit: event.impact_unit || "people",
    eventDate: event.event_date || null,
    startTime: event.start_time || null,
    endTime: event.end_time || null,
    expectedParticipants: parseInt(event.expected_participants) || 0,
    evidenceLink: event.evidence_link || null,
    status: event.status || "open",
    verificationLevel: event.verification_level || "tier_2",
    verificationMultiplier: parseFloat(event.verification_multiplier) || 1.5,
    hoursContributed: parseFloat(event.hours_contributed) || 0,
    usdValue: parseFloat(event.usd_value) || 0,
    createdAt: event.created_at ? new Date(event.created_at) : new Date(),
    updatedAt: event.updated_at ? new Date(event.updated_at) : new Date(),
    syncedAt: new Date(),
  };
}

// ============================================
// PUSH: Ambassadors (Supabase) → Tier (Firestore)
// ============================================

async function pushEntryToFirestore(entry, firebaseUid) {
  const db = getFirestore();
  if (!db) {
    log("⚠️ Firestore not available, skipping sync");
    return { success: false, reason: "firestore_unavailable" };
  }

  try {
    const firestoreData = supabaseEntryToFirestore(entry, firebaseUid);
    const docRef = db.collection("impact_logs").doc(entry.entry_id);
    await docRef.set(firestoreData, { merge: true });
    log("✅ Synced entry to Firestore:", entry.entry_id);
    return { success: true, firestoreDocId: entry.entry_id };
  } catch (error) {
    console.error("❌ Failed to push entry to Firestore:", error.message);
    return { success: false, error: error.message };
  }
}

async function pushEventToFirestore(event, firebaseUid) {
  const db = getFirestore();
  if (!db) return { success: false, reason: "firestore_unavailable" };

  try {
    const firestoreData = supabaseEventToFirestore(event, firebaseUid);
    const docRef = db.collection("impact_events").doc(event.event_id);
    await docRef.set(firestoreData, { merge: true });
    log("✅ Synced event to Firestore:", event.event_id);
    return { success: true, firestoreDocId: event.event_id };
  } catch (error) {
    console.error("❌ Failed to push event to Firestore:", error.message);
    return { success: false, error: error.message };
  }
}

async function pushAllUserEntriesToFirestore(supabase, supabaseUserId, firebaseUid) {
  const db = getFirestore();
  if (!db) return { success: false, reason: "firestore_unavailable" };

  try {
    const { data: entries, error } = await supabase
      .from("impact_entries")
      .select("*")
      .eq("user_id", supabaseUserId)
      .is("source_platform", null);

    if (error) throw error;

    let synced = 0;
    let failed = 0;
    for (const entry of (entries || [])) {
      const result = await pushEntryToFirestore(entry, firebaseUid);
      if (result.success) synced++; else failed++;
    }

    log(`✅ Push complete: ${synced} synced, ${failed} failed out of ${(entries || []).length}`);
    return { success: true, synced, failed, total: (entries || []).length };
  } catch (error) {
    console.error("❌ pushAllUserEntriesToFirestore error:", error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// PULL: Tier (Firestore) → Ambassadors (Supabase)
// ============================================

async function pullEntriesFromFirestore(supabase, supabaseUserId, firebaseUid, userRole) {
  const db = getFirestore();
  if (!db) return { success: false, reason: "firestore_unavailable" };

  try {
    const snapshot = await db.collection("impact_logs")
      .where("userId", "==", firebaseUid)
      .get();

    if (snapshot.empty) {
      log("ℹ️ No entries found in Firestore for user:", firebaseUid);
      return { success: true, synced: 0, skipped: 0, total: 0 };
    }

    let synced = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Skip entries that originated from Ambassadors (avoid circular sync)
      if (data.sourcePlatform === "t4l_ambassadors" || data.sourcePlatform === "ambassadors") {
        skipped++;
        continue;
      }

      // Check if this entry already exists in Supabase
      const { data: existing } = await supabase
        .from("impact_entries")
        .select("entry_id")
        .eq("source_entry_id", doc.id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      let supabaseEntry = firestoreEntryToSupabase(doc, supabaseUserId, userRole);

      let { error: insertError } = await supabase
        .from("impact_entries")
        .insert([supabaseEntry]);

      // Retry with missing columns removed
      if (insertError && insertError.message?.includes("Could not find the")) {
        const match = insertError.message.match(/Could not find the '(\w+)' column/);
        if (match) {
          log(`⚠️ Removing unknown column '${match[1]}' and retrying insert`);
          delete supabaseEntry[match[1]];
          const retry = await supabase.from("impact_entries").insert([supabaseEntry]);
          insertError = retry.error;
        }
      }

      if (insertError) {
        console.error("❌ Failed to insert Firestore entry:", insertError.message);
      } else {
        synced++;
      }
    }

    log(`✅ Pull complete: ${synced} synced, ${skipped} skipped from ${snapshot.size} total`);
    return { success: true, synced, skipped, total: snapshot.size };
  } catch (error) {
    console.error("❌ pullEntriesFromFirestore error:", error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// FULL BIDIRECTIONAL SYNC (with cooldown)
// ============================================

const _syncCooldowns = new Map();
const SYNC_COOLDOWN_MS = 30_000; // 30 seconds between full syncs per user

function isSyncCoolingDown(userId) {
  const last = _syncCooldowns.get(userId);
  if (!last) return false;
  return (Date.now() - last) < SYNC_COOLDOWN_MS;
}

async function fullSync(supabase, supabaseUserId, firebaseUid, userRole) {
  if (isSyncCoolingDown(supabaseUserId)) {
    log(`⏳ Sync cooldown active for ${supabaseUserId}, skipping`);
    return { success: true, skipped: true, reason: "cooldown" };
  }

  log(`🔄 Starting full sync for user: supabase=${supabaseUserId}, firebase=${firebaseUid}`);
  _syncCooldowns.set(supabaseUserId, Date.now());

  const pushResult = await pushAllUserEntriesToFirestore(supabase, supabaseUserId, firebaseUid);
  const pullResult = await pullEntriesFromFirestore(supabase, supabaseUserId, firebaseUid, userRole);

  log(`🔄 Sync done: pushed ${pushResult.synced || 0}, pulled ${pullResult.synced || 0}`);
  return {
    success: pushResult.success && pullResult.success,
    push: pushResult,
    pull: pullResult,
    syncedAt: new Date().toISOString(),
  };
}

// ============================================
// SYNC SINGLE ENTRY (called after create/update on Ambassadors)
// Non-blocking: call with .catch() so it doesn't slow down the main request
// ============================================

async function resolveFirebaseUid(supabase, user) {
  if (user.firebase_uid) return user.firebase_uid;
  if (!user.email) return null;

  try {
    const fbUser = await firebaseAdmin.auth().getUserByEmail(user.email);
    // Link it for future use
    await supabase
      .from("users")
      .update({ firebase_uid: fbUser.uid, updated_at: new Date().toISOString() })
      .eq("user_id", user.user_id);
    log(`🔗 Auto-linked Firebase UID ${fbUser.uid} for ${user.email} during push`);
    return fbUser.uid;
  } catch {
    return null;
  }
}

async function syncEntryBackground(supabase, entry, getUserByIdFn) {
  try {
    let user = await getUserByIdFn(entry.user_id, "ambassador");
    if (!user) {
      user = await getUserByIdFn(entry.user_id, "partner");
    }
    if (!user) return;

    const fbUid = await resolveFirebaseUid(supabase, user);
    if (!fbUid) return;

    await pushEntryToFirestore(entry, fbUid);
  } catch (err) {
    console.error("⚠️ Background sync failed:", err.message);
  }
}

module.exports = {
  pushEntryToFirestore,
  pushEventToFirestore,
  pushAllUserEntriesToFirestore,
  pullEntriesFromFirestore,
  fullSync,
  syncEntryBackground,
  supabaseEntryToFirestore,
  firestoreEntryToSupabase,
};
