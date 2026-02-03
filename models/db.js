// ============================================
// FIXED DATABASE FUNCTIONS FOR CENTRALIZED USERS TABLE
// ============================================
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require("uuid");

const supabaseUrl = process.env.SUPABASE_URL 
const supabaseKey = process.env.SUPABASE_ANON_KEY 
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// HELPER FUNCTIONS - FIXED FOR CENTRALIZED USERS
// ============================================

function normalizeAmbassadorData(userData, ambassadorData) {
  if (!userData || !ambassadorData) return null;
  
  return {
    id: ambassadorData.ambassador_id,
    ambassador_id: ambassadorData.ambassador_id,
    user_id: userData.user_id,
    email: userData.email,
    access_code: userData.access_code,
    password_hash: userData.password_hash,
    salt: userData.salt,
    status: userData.status, // ✅ status comes from users table
    role: 'ambassador',
    first_name: ambassadorData.first_name,
    last_name: ambassadorData.last_name,
    gender: ambassadorData.gender,
    whatsapp_number: ambassadorData.whatsapp_number,
    country: ambassadorData.country,
    state: ambassadorData.state,
    continent: ambassadorData.continent,
    cv_filename: ambassadorData.cv_filename,
    professional_headline: ambassadorData.professional_headline,
    professional_summary: ambassadorData.professional_summary,
    profile_completion_percentage: ambassadorData.profile_completion_percentage,
    subscription_type: ambassadorData.subscription_type || 'free', // ✅ NEW: Subscription type
    generated_password: ambassadorData.generated_password || '', // ✅ Include password for admin reference
    created_at: userData.created_at,
    updated_at: userData.updated_at,
    last_login: userData.last_login,
  };
}

function normalizePartnerData(userData, partnerData) {
  if (!userData || !partnerData) return null;
  
  return {
    id: partnerData.partner_id,
    partner_id: partnerData.partner_id,
    user_id: userData.user_id,
    email: userData.email,
    access_code: userData.access_code,
    password_hash: userData.password_hash,
    salt: userData.salt,
    status: userData.status, // ✅ status comes from users table
    role: 'partner',
    organization_name: partnerData.organization_name,
    contact_person: partnerData.contact_person,
    phone_number: partnerData.phone_number,
    location: partnerData.location,
    partner_type: partnerData.partner_type,
    generated_password: partnerData.generated_password || '', // ✅ Include password for admin reference
    created_at: userData.created_at,
    updated_at: userData.updated_at,
    last_login: userData.last_login,
  };
}

function normalizeAdminData(userData, adminData) {
  if (!userData || !adminData) return null;
  
  return {
    id: adminData.admin_id,
    admin_id: adminData.admin_id,
    user_id: userData.user_id,
    email: userData.email,
    access_code: userData.access_code,
    password_hash: userData.password_hash,
    salt: userData.salt,
    status: userData.status,
    role: 'admin',
    first_name: adminData.first_name,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
    last_login: userData.last_login,
  };
}


async function createNotification(
  recipientId,
  recipientType,
  notificationType,
  title,
  message,
  link = null,
  applicationId = null,
  requestId = null,
  articleId = null,
  certificateId = null // Optional: for linking notifications to certificates
) {
  try {
    const notificationData = {
      notification_id: uuidv4(),
      recipient_id: recipientId,
      recipient_type: recipientType,
      type: notificationType,
      title: title,
      message: message,
      link: link,
      read: false, // ✅ ENSURE THIS IS FALSE
      created_at: new Date().toISOString(),
      application_id: applicationId || null,
      request_id: requestId || null,
      article_id: articleId || null,
    };

    // Only add certificate_id if provided AND column exists in table
    // To enable: Run: ALTER TABLE notifications ADD COLUMN certificate_id UUID REFERENCES certificates(certificate_id);
    // Also need to update the constraint: ALTER TABLE notifications DROP CONSTRAINT notifications_reference_check;
    // Then recreate: ALTER TABLE notifications ADD CONSTRAINT notifications_reference_check CHECK (
    //   (application_id IS NOT NULL)::int + (request_id IS NOT NULL)::int + (article_id IS NOT NULL)::int + (certificate_id IS NOT NULL)::int = 1
    // );
    if (certificateId) {
      notificationData.certificate_id = certificateId;
    }

    console.log("📝 Creating notification:", notificationData);

    let { data, error } = await supabase
      .from("notifications")
      .insert([notificationData])
      .select()
      .single();

    // ✅ FIX: Handle constraint errors
    if (error && error.code === '23514') {
      // If constraint error and certificate_id was included, retry without it
      if (certificateId) {
        console.warn("⚠️ Constraint violation with certificate_id, retrying without it...");
        delete notificationData.certificate_id;
        const retryData = { ...notificationData };
        
        const retryResult = await supabase
          .from("notifications")
          .insert([retryData])
          .select()
          .single();
        
        if (retryResult.error) {
          console.error("❌ Notification creation failed even without certificate_id:", retryResult.error);
          return null;
        }
        
        console.log("✅ Notification created (without certificate_id due to constraint):", retryResult.data);
        return retryResult.data;
      }
      
      // If constraint error for notifications without references (like journey_completed)
      // This means the database constraint needs to be updated - log a warning
      console.error("❌ Notification creation failed due to constraint violation.");
      console.error("   This notification type may not require reference fields.");
      console.error("   Please run the migration: migrations/fix-notifications-constraint.sql");
      console.error("   Or update the constraint to allow all-null references for this notification type.");
      return null;
    }

    if (error) {
      console.error("❌ Notification creation failed:", error);
      return null;
    }

    console.log("✅ Notification created:", data);
    return data;
  } catch (error) {
    console.error("⚠️ Notification error:", error.message);
    return null;
  }
}
// ============================================
// GET USER BY EMAIL - FIXED
// ============================================
async function getUserByEmail(email, role = 'ambassador') {
  try {
    console.log(`🔍 getUserByEmail: Looking for ${role} with email: ${email}`);

    // Step 1: Get user from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('user_type', role)
      .single();

    if (userError || !userData) {
      console.log(`⚠️ No user found with email: ${email} and type: ${role}`);
      return null;
    }

    // Step 2: Get role-specific data
    let roleTable, roleIdField, normalizer;
    
    if (role === 'ambassador') {
      roleTable = 'ambassadors';
      roleIdField = 'user_id';
      normalizer = normalizeAmbassadorData;
    } else if (role === 'partner') {
      roleTable = 'partners';
      roleIdField = 'user_id';
      normalizer = normalizePartnerData;
    } else if (role === 'admin') {
      roleTable = 'admins';
      roleIdField = 'user_id';
      normalizer = normalizeAdminData;
    } else {
      console.error('❌ Invalid role:', role);
      return null;
    }

    const { data: roleData, error: roleError } = await supabase
      .from(roleTable)
      .select('*')
      .eq(roleIdField, userData.user_id)
      .single();

    if (roleError || !roleData) {
      console.error(`❌ No ${role} profile found for user_id:`, userData.user_id);
      return null;
    }

    const normalized = normalizer(userData, roleData);
    console.log(`✅ Found ${role}:`, normalized.id, normalized.email);
    return normalized;
  } catch (error) {
    console.error('❌ getUserByEmail error:', error);
    return null;
  }
}

// ============================================
// GET USER BY ID - FIXED TO PRIORITIZE user_id
// ============================================
async function getUserById(id, role = 'ambassador') {
  try {
    console.log(`🔍 getUserById: Looking for ${role} with ID: ${id}`);

    let roleTable, roleIdField, normalizer;
    
    if (role === 'ambassador') {
      roleTable = 'ambassadors';
      roleIdField = 'ambassador_id';
      normalizer = normalizeAmbassadorData;
    } else if (role === 'partner') {
      roleTable = 'partners';
      roleIdField = 'partner_id';
      normalizer = normalizePartnerData;
    } else if (role === 'admin') {
      roleTable = 'admins';
      roleIdField = 'admin_id';
      normalizer = normalizeAdminData;
    } else {
      console.error('❌ Invalid role:', role);
      return null;
    }

    // ✅ FIX: Try user_id FIRST (since sessions use user_id)
    let { data: roleData, error: roleError } = await supabase
      .from(roleTable)
      .select('*')
      .eq('user_id', id)  // ✅ Look up by user_id FIRST
      .single();

    // If not found by user_id, try by role-specific ID (for backward compatibility)
    if (roleError || !roleData) {
      console.log(`⚠️ No ${role} found with user_id: ${id}, trying ${roleIdField}...`);
      
      const result = await supabase
        .from(roleTable)
        .select('*')
        .eq(roleIdField, id)  // Fallback to ambassador_id/partner_id/admin_id
        .single();
      
      roleData = result.data;
      roleError = result.error;
    }

    if (roleError || !roleData) {
      console.log(`❌ No ${role} found with ID: ${id}`);
      return null;
    }

    // Step 2: Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', roleData.user_id)
      .single();

    if (userError || !userData) {
      console.error(`❌ No user found for ${role} with user_id:`, roleData.user_id);
      return null;
    }

    const normalized = normalizer(userData, roleData);
    console.log(`✅ Found ${role}:`, normalized.id, normalized.email);
    return normalized;
  } catch (error) {
    console.error('❌ getUserById error:', error);
    return null;
  }
}

// ============================================
// CREATE USER - FIXED (TWO-TABLE INSERT)
// ============================================
async function createUser(userData, role = 'ambassador') {
  try {
    console.log(`📝 Creating ${role} with email:`, userData.email);

    // Step 1: Create user in users table
    const userInsert = {
      email: userData.email.toLowerCase(),
      password_hash: userData.password_hash,
      salt: userData.salt,
      user_type: role,
      status: userData.status || 'active',
      access_code: userData.access_code,
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([userInsert])
      .select()
      .single();

    if (userError) {
      console.error(`❌ Error creating user:`, userError);
      throw userError;
    }

    console.log('✅ User created with user_id:', newUser.user_id);

    // Step 2: Create role-specific profile
    let roleTable, roleInsert, normalizer;

    if (role === 'ambassador') {
      roleTable = 'ambassadors';  // ✅ CORRECT
      normalizer = normalizeAmbassadorData;
      roleInsert = {  // ✅ CORRECT
        user_id: newUser.user_id,
        email: userData.email.toLowerCase(),
        first_name: userData.first_name || userData.name || '',
        last_name: userData.last_name || '',
        gender: userData.gender || '',
        whatsapp_number: userData.whatsapp_number || '',
        country: userData.country || '',
        state: userData.state || '',
        continent: userData.continent || '',
        cv_filename: userData.cv_filename || null,
        generated_password: userData.generated_password || null, // Store plain text password for admin reference
        subscription_type: userData.subscription_type || 'free', // ✅ NEW: Subscription type
      };
    } else if (role === 'partner') {
      roleTable = 'partners';
      normalizer = normalizePartnerData;
    roleInsert = {
      user_id: newUser.user_id,
      organization_name: userData.organization_name || userData.organizationName || '',
      contact_person: userData.contact_person || userData.contactName || '',  // <-- THIS IS CORRECT
      phone_number: userData.phone_number || userData.phoneNumber || null,
      location: userData.location || null,
      partner_type: userData.partner_type || userData.partnerType || null,
      generated_password: userData.generated_password || null, // Store plain text password for admin reference
    };
    } else if (role === 'admin') {
      roleTable = 'admins';
      normalizer = normalizeAdminData;
      roleInsert = {
        user_id: newUser.user_id,
        first_name: userData.first_name || userData.name || '',
      };
    } else {
      throw new Error('Invalid role');
    }

    const { data: roleData, error: roleError } = await supabase
      .from(roleTable)
      .insert([roleInsert])
      .select()
      .single();

    if (roleError) {
      console.error(`❌ Error creating ${role} profile:`, roleError);
      // Rollback: delete user if profile creation fails
      await supabase.from('users').delete().eq('user_id', newUser.user_id);
      throw roleError;
    }

    const normalized = normalizer(newUser, roleData);
    console.log(`✅ ${role} created successfully:`, normalized.id);
    return normalized;
  } catch (error) {
    console.error('❌ createUser error:', error);
    throw error;
  }
}

// ============================================
// UPDATE USER - FIXED
// ============================================
async function updateUser(id, updates, role = 'ambassador') {
  try {
    console.log(`📝 Updating ${role} with ID:`, id);

    // Determine which fields go to users table vs role table
    const userUpdates = {};
    const roleUpdates = {};

    // Fields that go to users table
    if (updates.email !== undefined) userUpdates.email = updates.email;
    if (updates.password_hash !== undefined) userUpdates.password_hash = updates.password_hash;
    if (updates.salt !== undefined) userUpdates.salt = updates.salt;
    if (updates.status !== undefined) userUpdates.status = updates.status;
    if (updates.access_code !== undefined) userUpdates.access_code = updates.access_code;
    if (updates.last_login !== undefined) userUpdates.last_login = updates.last_login;

    // Fields that go to role-specific tables
    if (role === 'ambassador') {
      if (updates.first_name !== undefined) roleUpdates.first_name = updates.first_name;
      if (updates.last_name !== undefined) roleUpdates.last_name = updates.last_name;
      if (updates.cv_filename !== undefined) roleUpdates.cv_filename = updates.cv_filename;
      if (updates.gender !== undefined) roleUpdates.gender = updates.gender;
      if (updates.whatsapp_number !== undefined) roleUpdates.whatsapp_number = updates.whatsapp_number;
      if (updates.country !== undefined) roleUpdates.country = updates.country;
      if (updates.state !== undefined) roleUpdates.state = updates.state;
      if (updates.continent !== undefined) roleUpdates.continent = updates.continent;
      if (updates.subscription_type !== undefined) roleUpdates.subscription_type = updates.subscription_type; // ✅ NEW: Subscription type
    } else if (role === 'partner') {
      if (updates.organization_name !== undefined) roleUpdates.organization_name = updates.organization_name;
      if (updates.contact_person !== undefined) roleUpdates.contact_person = updates.contact_person;
      if (updates.phone_number !== undefined) roleUpdates.phone_number = updates.phone_number;
      if (updates.location !== undefined) roleUpdates.location = updates.location;
      if (updates.partner_type !== undefined) roleUpdates.partner_type = updates.partner_type;
    } else if (role === 'admin') {
      if (updates.first_name !== undefined) roleUpdates.first_name = updates.first_name;
    }

    // Get current role data to find user_id
    let roleTable, roleIdField, normalizer;
    
    if (role === 'ambassador') {
      roleTable = 'ambassadors';
      roleIdField = 'ambassador_id';
      normalizer = normalizeAmbassadorData;
    } else if (role === 'partner') {
      roleTable = 'partners';
      roleIdField = 'partner_id';
      normalizer = normalizePartnerData;
    } else if (role === 'admin') {
      roleTable = 'admins';
      roleIdField = 'admin_id';
      normalizer = normalizeAdminData;
    }

    const { data: currentRoleData } = await supabase
      .from(roleTable)
      .select('*')
      .eq(roleIdField, id)
      .single();

    if (!currentRoleData) {
      throw new Error(`${role} not found`);
    }

    // Update users table if needed
    let updatedUserData = null;
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('user_id', currentRoleData.user_id)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error updating user:`, error);
        throw error;
      }
      updatedUserData = data;
    }

    // Update role table if needed
    let updatedRoleData = currentRoleData;
    if (Object.keys(roleUpdates).length > 0) {
      roleUpdates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from(roleTable)
        .update(roleUpdates)
        .eq(roleIdField, id)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error updating ${role} profile:`, error);
        throw error;
      }
      updatedRoleData = data;
    }

    // Get fresh user data if not already updated
    if (!updatedUserData) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', currentRoleData.user_id)
        .single();
      updatedUserData = data;
    }

    const normalized = normalizer(updatedUserData, updatedRoleData);
    console.log(`✅ ${role} updated successfully:`, normalized.id);
    return normalized;
  } catch (error) {
    console.error('❌ updateUser error:', error);
    throw error;
  }
}

// ============================================
// DELETE USER - FIXED (CASCADE HANDLES PROFILE)
// ============================================
async function deleteUser(id, role = 'ambassador') {
  try {
    console.log(`🗑️ Deleting ${role} with ID:`, id);

    let roleTable, roleIdField;
    
    if (role === 'ambassador') {
      roleTable = 'ambassadors';
      roleIdField = 'ambassador_id';
    } else if (role === 'partner') {
      roleTable = 'partners';
      roleIdField = 'partner_id';
    } else if (role === 'admin') {
      roleTable = 'admins';
      roleIdField = 'admin_id';
    }

    // Get user_id from role table
    const { data: roleData } = await supabase
      .from(roleTable)
      .select('user_id')
      .eq(roleIdField, id)
      .single();

    if (!roleData) {
      throw new Error(`${role} not found`);
    }

    // Delete from users table (CASCADE will delete role profile)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', roleData.user_id);

    if (error) {
      console.error(`❌ Error deleting user:`, error);
      throw error;
    }

    console.log(`✅ ${role} deleted successfully`);
    return true;
  } catch (error) {
    console.error('❌ deleteUser error:', error);
    throw error;
  }
}

// ============================================
// LIST USERS - FIXED
// ============================================
async function listUsers(role = 'ambassador', filters = {}) {
  try {
    let roleTable, roleIdField, normalizer;

    if (role === 'ambassador') {
      roleTable = 'ambassadors';
      roleIdField = 'ambassador_id';
      normalizer = normalizeAmbassadorData;
    } else if (role === 'partner') {
      roleTable = 'partners';
      roleIdField = 'partner_id';
      normalizer = normalizePartnerData;
    } else if (role === 'admin') {
      roleTable = 'admins';
      roleIdField = 'admin_id';
      normalizer = normalizeAdminData;
    } else {
      return { items: [], total: 0 };
    }

    // Build query with join
    let query = supabase
      .from(roleTable)
      .select(`
        *,
        users!inner(*)
      `, { count: 'exact' });

    // Apply filters
    if (filters.status) {
      query = query.eq('users.status', filters.status);
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `users.email.ilike.${searchTerm},users.access_code.ilike.${searchTerm},first_name.ilike.${searchTerm},contact_person.ilike.${searchTerm},organization_name.ilike.${searchTerm}`
      );
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error(`❌ Error listing ${role}s:`, error);
      return { items: [], total: 0 };
    }

    // Normalize the joined data
    const items = (data || []).map(item => normalizer(item.users, item));

    console.log(`✅ Listed ${items.length} ${role}s`);
    return { items, total: count || 0, limit, offset };
  } catch (error) {
    console.error('❌ listUsers error:', error);
    return { items: [], total: 0 };
  }
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

async function getServices(filters = {}) {
  try {
    let query = supabase.from('services').select('*', { count: 'exact' });

    // Apply filters
    if (filters.partnerId) {
      query = query.eq('partner_id', filters.partnerId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    query = query.order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

    const { data: services, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching services:', error);
      throw error;
    }

    return { services: services || [], total: count || 0 };
  } catch (error) {
    console.error('❌ getServices error:', error);
    throw error;
  }
}

async function getServiceById(serviceId) {
  try {
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('service_id', serviceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching service:', error);
      throw error;
    }

    return service;
  } catch (error) {
    console.error('❌ getServiceById error:', error);
    throw error;
  }
}

async function createService(serviceData) {
  try {
    console.log('💾 Creating service:', serviceData);

    const { data: service, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating service:', error);
      throw error;
    }

    console.log('✅ Service created:', service.service_id);
    return service;
  } catch (error) {
    console.error('❌ createService error:', error);
    throw error;
  }
}

async function updateService(serviceId, updates) {
  try {
    updates.updated_at = new Date().toISOString();

    const { data: service, error } = await supabase
      .from('services')
      .update(updates)
      .eq('service_id', serviceId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating service:', error);
      throw error;
    }

    return service;
  } catch (error) {
    console.error('❌ updateService error:', error);
    throw error;
  }
}

async function deleteService(serviceId) {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('service_id', serviceId);

    if (error) {
      console.error('❌ Error deleting service:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ deleteService error:', error);
    throw error;
  }
}

async function getServiceRequests(serviceId) {
  try {
    const { data: requests, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching service requests:', error);
      throw error;
    }

    return requests || [];
  } catch (error) {
    console.error('❌ getServiceRequests error:', error);
    throw error;
  }
}

async function createServiceRequest(requestData) {
  try {
    const { data: request, error } = await supabase
      .from('service_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating service request:', error);
      throw error;
    }

    return request;
  } catch (error) {
    console.error('❌ createServiceRequest error:', error);
    throw error;
  }
}

async function updateServiceRequestStatus(requestId, status) {
  try {
    const { data: request, error } = await supabase
      .from('service_requests')
      .update({ 
        status: status,
        updated_at: new Date().toISOString() 
      })
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating service request:', error);
      throw error;
    }

    return request;
  } catch (error) {
    console.error('❌ updateServiceRequestStatus error:', error);
    throw error;
  }
}

async function getPartnerUserIdFromPartnerId(partnerId) {
  try {
    const { data: partner, error } = await supabase
      .from('partners')
      .select('user_id')
      .eq('partner_id', partnerId)
      .single();

    if (error) return null;
    return partner?.user_id;
  } catch (error) {
    console.error('❌ Error getting partner user_id:', error);
    return null;
  }
}

async function getAmbassadorUserIdFromAmbassadorId(ambassadorId) {
  try {
    const { data: ambassador, error } = await supabase
      .from('ambassadors')
      .select('user_id')
      .eq('ambassador_id', ambassadorId)
      .single();

    if (error) return null;
    return ambassador?.user_id;
  } catch (error) {
    console.error('❌ Error getting ambassador user_id:', error);
    return null;
  }
}

// ============================================
// JOURNEY PROGRESS, ARTICLES, POSTS (NO CHANGES NEEDED)
// ============================================

async function getJourneyProgress(ambassadorId) {
  try {
    const { data, error } = await supabase
      .from('journey_progress')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching journey progress:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ getJourneyProgress error:', error);
    return null;
  }
}

async function upsertJourneyProgress(ambassadorId, progressData) {
  try {
    const updateData = {
      ambassador_id: ambassadorId,
      current_month: progressData.current_month || 1,
      completed_tasks: progressData.completed_tasks || {},
      start_date: progressData.start_date || new Date().toISOString(),
      month_start_dates: progressData.month_start_dates || { 1: new Date().toISOString() },
      last_updated: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('journey_progress')
      .upsert(updateData, { onConflict: 'ambassador_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ upsertJourneyProgress error:', error);
    throw error;
  }
}

async function getAllJourneyProgress() {
  try {
    const { data, error } = await supabase
      .from('journey_progress')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) return [];
    return data || [];
  } catch (error) {
    return [];
  }
}

async function getArticles(filters = {}) {
  try {
    let query = supabase.from('articles').select('*');
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch (error) {
    return [];
  }
}

async function getArticleById(id) {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('article_id', id)
      .single();

    if (error && error.code !== 'PGRST116') return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function createArticle(articleData) {
  try {
    const articleId = uuidv4();
    
    const insertData = {
      article_id: articleId,
      title: articleData.title,
      content: articleData.content,
      excerpt: articleData.excerpt || articleData.title.substring(0, 100) + '...',
      category: articleData.category || 'general',
      status: articleData.status || 'draft',
      ambassador_id: articleData.ambassador_id,
      author_name: articleData.author_name,
      author_role: articleData.author_role,
      views: 0,
      likes: 0,
    };

    const { data, error } = await supabase
      .from('articles')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ createArticle error:', error);
    throw error;
  }
}

async function updateArticle(id, updates) {
  try {
    const { data, error } = await supabase
      .from('articles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('article_id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

async function deleteArticle(id) {
  try {
    const { error } = await supabase.from('articles').delete().eq('article_id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
}

async function incrementArticleViews(id) {
  try {
    const { data: article } = await supabase
      .from('articles')
      .select('views')
      .eq('article_id', id)
      .single();

    if (article) {
      await supabase
        .from('articles')
        .update({ views: (article.views || 0) + 1 })
        .eq('article_id', id);
    }
  } catch (error) {
    console.error('❌ incrementArticleViews error:', error);
  }
}

async function getPosts(filters = {}) {
  try {
    let query = supabase.from('posts').select('*');
    if (filters.authorId) query = query.eq('partner_id', filters.authorId);
    if (filters.category) query = query.eq('category', filters.category);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch (error) {
    return [];
  }
}

async function createPost(postData) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([{
        title: postData.title,
        content: postData.content,
        category: postData.category || 'general',
        partner_id: postData.partner_id || postData.authorId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

async function createSession(sessionData) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

async function getSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function deleteSession(sessionId) {
  try {
    const { error } = await supabase.from('sessions').delete().eq('session_id', sessionId);
    if (error) return false;
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// LINKEDIN AUDIT FUNCTIONS
// ============================================

async function createLinkedInAudit(auditData) {
  try {
    console.log('📝 Creating LinkedIn audit for ambassador:', auditData.ambassador_id);
    
    const { data, error } = await supabase
      .from('linkedin_audits')
      .insert([auditData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating LinkedIn audit:', error);
      throw error;
    }

    console.log('✅ LinkedIn audit created:', data.audit_id);
    return data;
  } catch (error) {
    console.error('❌ createLinkedInAudit error:', error);
    throw error;
  }
}

async function getLinkedInAuditByAmbassador(ambassadorId) {
  try {
    console.log('🔍 Fetching LinkedIn audit for ambassador:', ambassadorId);
    
    const { data, error } = await supabase
      .from('linkedin_audits')
      .select(`
        *,
        admins:admin_id (first_name)
      `)
      .eq('ambassador_id', ambassadorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching LinkedIn audit:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ No LinkedIn audit found for ambassador:', ambassadorId);
      return null;
    }

    console.log('✅ Found LinkedIn audit:', data.audit_id);
    return data;
  } catch (error) {
    console.error('❌ getLinkedInAuditByAmbassador error:', error);
    return null;
  }
}

async function updateLinkedInAudit(auditId, updates) {
  try {
    console.log('📝 Updating LinkedIn audit:', auditId);
    
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('linkedin_audits')
      .update(updates)
      .eq('audit_id', auditId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating LinkedIn audit:', error);
      throw error;
    }

    console.log('✅ LinkedIn audit updated:', data.audit_id);
    return data;
  } catch (error) {
    console.error('❌ updateLinkedInAudit error:', error);
    throw error;
  }
}

async function deleteLinkedInAudit(auditId) {
  try {
    console.log('🗑️ Deleting LinkedIn audit:', auditId);
    
    const { error } = await supabase
      .from('linkedin_audits')
      .delete()
      .eq('audit_id', auditId);

    if (error) {
      console.error('❌ Error deleting LinkedIn audit:', error);
      throw error;
    }

    console.log('✅ LinkedIn audit deleted');
    return true;
  } catch (error) {
    console.error('❌ deleteLinkedInAudit error:', error);
    throw error;
  }
}

async function getLinkedInAudits(filters = {}) {
  try {
    console.log('🔍 Fetching LinkedIn audits with filters:', filters);
    
    let query = supabase
      .from('linkedin_audits')
      .select(`
        *,
        ambassadors:ambassador_id (first_name, last_name, email),
        admins:admin_id (first_name)
      `, { count: 'exact' });

    // Apply filters
    if (filters.ambassadorId) {
      query = query.eq('ambassador_id', filters.ambassadorId);
    }
    if (filters.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`notes.ilike.%${filters.search}%`);
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    query = query.order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching LinkedIn audits:', error);
      return { audits: [], total: 0 };
    }

    console.log(`✅ Found ${data?.length || 0} LinkedIn audits`);
    return { audits: data || [], total: count || 0 };
  } catch (error) {
    console.error('❌ getLinkedInAudits error:', error);
    return { audits: [], total: 0 };
  }
}

module.exports = {
  supabase, // Export supabase client
  supabase,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  getJourneyProgress,
  upsertJourneyProgress,
  getAllJourneyProgress,
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  incrementArticleViews,
  getPosts,
  createPost,
  createSession,
  getSession,
  deleteSession,
  // Service functions
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceRequests,
  createServiceRequest,
  updateServiceRequestStatus,
  getPartnerUserIdFromPartnerId,
  getAmbassadorUserIdFromAmbassadorId,
  // LinkedIn Audit functions
  createLinkedInAudit,
  getLinkedInAuditByAmbassador,
  updateLinkedInAudit,
  deleteLinkedInAudit,
  getLinkedInAudits,
  // Notification function
  createNotification,
};