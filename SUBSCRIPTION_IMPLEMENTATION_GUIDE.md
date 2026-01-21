# 🔐 Subscription System Implementation Guide

## Overview
This guide explains how to implement and use the free/paid subscription system for your T4L Ambassador platform.

---

## 📋 Step-by-Step Implementation

### Step 1: Database Migration
Run the SQL migration to add the subscription field:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the Migration**
   - Open the file: `migrations/add-subscription-type.sql`
   - Copy and paste the SQL into the Supabase SQL Editor
   - Click "Run" to execute

3. **Verify Migration**
   ```sql
   SELECT subscription_type, COUNT(*) 
   FROM ambassadors 
   GROUP BY subscription_type;
   ```
   You should see all ambassadors with `subscription_type = 'free'`

### Step 2: Add Subscription Manager to Ambassador Pages
Add the subscription manager script to your ambassador dashboard pages:

**Example: Add to `ambassador-dashboard.html`**

```html
<!-- Add before closing </body> tag -->
<script src="/js/subscription-manager.js"></script>
```

**Pages to update:**
- `/public/ambassador-dashboard.html`
- `/public/journey.html`
- `/public/article-amb.html`
- `/public/profile-ambassador.html`
- `/public/services-ambassador.html`
- Any other ambassador-facing pages

### Step 3: Apply Server-Side Protection (Optional)
To add server-side route protection, update routes in `server.js`:

```javascript
// Example: Protect journey route
app.get("/journey.html", 
  requireAuth, 
  requireRole("ambassador"), 
  requireSubscription("journey"), // ✅ This protects the route
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "journey.html"));
  }
);
```

**Routes to protect:**
- `/journey.html` → `requireSubscription("journey")`
- `/article-amb.html` → `requireSubscription("articles")`
- `/profile-ambassador.html` → `requireSubscription("profile")`
- `/services-ambassador.html` → `requireSubscription("services")`

---

## 🎯 Free vs Paid Features

### Free Tier Access ✅
- **Events** (`/ambassador-events` or pages with "events" in URL)
- **Partners** (`/Partner-Calls.html` or pages with "partner" in URL)
- **Impact Log** (`/impactlog-ambassador.html` or pages with "impactlog" in URL)
- **Chat** (`/chat-pillar-ambassador.html` or pages with "chat-pillar" in URL)

### Paid Tier Access 🚀
All free features PLUS:
- **Journey Progress Tracking** (`/journey.html`)
- **Article Publishing** (`/article-amb.html`)
- **Profile Customization** (`/profile-ambassador.html`)
- **Professional Services** (`/services-ambassador.html`)
- **Analytics & Insights**
- **Priority Support**

---

## 🔧 Configuration

### Allowed URLs for Free Users
Update in `public/js/subscription-manager.js`:

```javascript
this.freeFeatures = ['events', 'partners', 'impact-log', 'chat'];
```

### Adding New Features
To add a new feature to the free tier:

1. Add feature name to `freeFeatures` array in `subscription-manager.js`
2. Update URL detection logic if needed
3. Test with a free user account

---

## 📝 Admin Workflow

### Creating a New Ambassador

1. **Navigate to Admin Dashboard**
   - Click "Add Users" or go to `/admin-add-user.html`

2. **Fill Ambassador Form**
   - Enter name and email
   - Generate access code
   - Generate password
   - **Select Subscription Type:**
     - **Free**: Limited access (Events, Partners, Impact Log, Chat)
     - **Paid**: Full access to all features

3. **Save**
   - Ambassador receives welcome email
   - Subscription status is stored in database
   - Access is automatically restricted based on subscription

### Upgrading an Ambassador

**Option 1: Via Admin Dashboard (if implemented)**
- Navigate to ambassador edit page
- Change subscription type to "paid"
- Save changes

**Option 2: Direct Database Update**
```sql
UPDATE ambassadors 
SET subscription_type = 'paid' 
WHERE ambassador_id = '{ambassador_id}';
```

**Option 3: Via API (if endpoint exists)**
```javascript
await fetch('/admin/api/ambassadors/{ambassador_id}', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    subscription_type: 'paid'
  })
});
```

---

## 🎨 User Experience

### Free User Clicks Restricted Feature
1. Navigation link shows lock icon 🔒
2. Link is slightly faded (opacity: 0.5)
3. Clicking shows upgrade modal with:
   - Current free features
   - Benefits of paid subscription
   - Contact support button

### Paid User Experience
- Full access to all features
- Crown icon 👑 in subscription badge
- No restrictions or locks

---

## 🧪 Testing

### Test Free Subscription
```javascript
// 1. Create free ambassador via admin panel
// 2. Sign in as that ambassador
// 3. Try to access /journey.html
// Expected: Upgrade modal appears

// 4. Check subscription API
fetch('/api/ambassador/subscription', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data));
// Expected: { subscription_type: 'free', has_full_access: false }
```

### Test Paid Subscription
```javascript
// 1. Create paid ambassador via admin panel
// 2. Sign in as that ambassador
// 3. Access all features
// Expected: Full access, no restrictions

// 4. Check subscription API
fetch('/api/ambassador/subscription', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data));
// Expected: { subscription_type: 'paid', has_full_access: true }
```

---

## 🔍 Troubleshooting

### Issue: All users defaulting to free
**Solution:** Check database migration ran successfully
```sql
SELECT subscription_type, COUNT(*) 
FROM ambassadors 
GROUP BY subscription_type;
```

### Issue: Paid users seeing upgrade modal
**Solution:** 
1. Check `getUserById()` returns subscription_type
2. Verify subscription manager is initialized
3. Check browser console for errors

```javascript
// Debug subscription check
console.log(ambassador.subscription_type); // Should be 'paid'
```

### Issue: Navigation restrictions not working
**Solution:** 
1. Ensure subscription manager script is loaded
2. Check browser console for initialization message:
   ```
   ✅ Subscription loaded: { type: 'free', hasFullAccess: false }
   ```
3. Verify script is added to page before closing `</body>` tag

### Issue: Server-side protection not working
**Solution:**
1. Verify `requireSubscription()` middleware is applied
2. Check route order (middleware must be before route handler)
3. Verify user is authenticated and has ambassador role

---

## 📊 Database Queries

### View All Subscription Types
```sql
SELECT 
  a.first_name,
  a.last_name,
  u.email,
  a.subscription_type,
  a.created_at
FROM ambassadors a
JOIN users u ON a.user_id = u.user_id
ORDER BY a.created_at DESC;
```

### Count by Subscription Type
```sql
SELECT 
  subscription_type,
  COUNT(*) as count
FROM ambassadors
GROUP BY subscription_type;
```

### Upgrade All Ambassadors to Paid (Emergency)
```sql
UPDATE ambassadors 
SET subscription_type = 'paid';
```

### Find Free Users
```sql
SELECT 
  a.ambassador_id,
  a.first_name,
  u.email
FROM ambassadors a
JOIN users u ON a.user_id = u.user_id
WHERE a.subscription_type = 'free';
```

---

## 🚀 Future Enhancements

1. **Stripe Integration**: Accept payments for upgrades
2. **Trial Periods**: 30-day free trial of paid features
3. **Usage Limits**: Allow X articles per month on free tier
4. **Team Plans**: Multi-user subscriptions
5. **Admin Dashboard**: Subscription analytics and metrics
6. **Email Notifications**: Notify users about subscription status changes

---

## ✅ Checklist

Before deploying:
- [ ] Run database migration
- [ ] Update `models/db.js` ✅
- [ ] Update `server.js` ✅
- [ ] Update admin add user page ✅
- [ ] Add subscription manager to frontend pages
- [ ] Test free user restrictions
- [ ] Test paid user full access
- [ ] Document for team
- [ ] Create admin guide

---

## 📞 Support

If ambassadors need subscription help:
- Email: support@t4leader.com (update with your support email)
- Add support link in upgrade modal
- Create `/contact-support.html` page (optional)

---

## 📚 Files Modified

1. **`models/db.js`**
   - Added `subscription_type` to `normalizeAmbassadorData()`
   - Added `subscription_type` to `createUser()` for ambassadors
   - Added `subscription_type` to `updateUser()` for ambassadors

2. **`server.js`**
   - Added `subscription_type` to POST `/admin/api/ambassadors` endpoint
   - Added GET `/api/ambassador/subscription` endpoint
   - Created `requireSubscription()` middleware

3. **`public/admin-add-user.html`**
   - Added subscription dropdown field
   - Updated form submission to include `subscription_type`

4. **`public/js/subscription-manager.js`** (NEW)
   - Frontend subscription checking
   - Navigation restriction
   - Upgrade modal

5. **`migrations/add-subscription-type.sql`** (NEW)
   - Database migration script

---

## 🎉 You're All Set!

The subscription system is now fully implemented. Follow the steps above to:
1. Run the database migration
2. Add the subscription manager to your pages
3. Test with free and paid users
4. Start managing subscriptions!
