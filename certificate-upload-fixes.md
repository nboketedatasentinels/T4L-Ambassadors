## Certificate Upload Fix - Journey Progress Task

### 🐛 Issues Found

- **Race Condition in Frontend (`journey.html`)**
  - Frontend tried to toggle the journey task immediately after submit, without giving the backend time to finish persisting the certificate and related state.

- **Incomplete Error Recovery (`server.js`)**
  - On unexpected failures after upload, files could be left in storage without a clean way to roll back associated data.

- **No Explicit Timeout Handling**
  - Long-running uploads on slow/unstable networks could hang from the user’s perspective.

- **Validation and Error Messaging**
  - Validation was present but needed to be paired with clearer, categorized error messages for end users.

---

### ✅ Backend Fixes (`server.js`)

1. **Upload Timeout Around Multer**

   - Wrapped the `certificateUpload.single("certificate")` middleware with a **30-second timeout**.
   - If the timeout fires before Multer completes:
     - Responds with **HTTP 408** and a clear `"Upload timed out"` message.
     - Prevents the request from hanging indefinitely on poor connections.

2. **Full Rollback on Any Failure**

   - Introduced two tracking variables at the top of the handler:
     - `uploadedFilename` – tracks the file saved to Supabase Storage.
     - `certificateId` – tracks the certificate record ID being created/updated.
   - In the main `catch` block:
     - If `uploadedFilename` is set, attempt to delete the file from the `certificates` bucket.
     - If `certificateId` is set, attempt to delete the corresponding row from the `certificates` table.
   - Cleanup failures are logged but **do not** overwrite the primary error response to the client.

3. **Improved Error Categorization**

   - Centralized error response logic to map low-level errors into clear, user-facing messages:
     - **Timeout / ETIMEDOUT** → `408 Upload timed out` with guidance to check connection.
     - **Network / ECONNREFUSED** → `503 Network error` with connection advice.
     - **Storage bucket / configuration** → `503 Storage unavailable` with “try again later” messaging.
     - **Quota / rate limit** → `429 Upload limit reached` with “wait and retry” guidance.
   - In development, the raw details are still available via the `details` field to support debugging.

4. **Existing Safety Nets (Retained)**

   - Validation for:
     - Authenticated user
     - Valid `courseType`
     - Presence and integrity of `req.file.buffer`
   - Supabase upload still uses:
     - Retry with exponential backoff
     - Specific handling for bucket configuration, quota, and duplicate filename scenarios
   - Database write logic still:
     - Uses upsert-like behavior (update existing or insert new)
     - Cleans up uploaded file immediately if the DB write fails before response.

---

### ✅ Frontend Fixes (`journey.html`)

1. **Safer Auto-Toggle After Upload**

   - In `handleCertificateUploadSubmit`:
     - After a successful certificate upload and state update, we now **wait 500ms** before attempting to auto-toggle the related task.
     - This helps ensure the backend transaction has fully committed before triggering the task toggle call.
   - Enhanced logging:
     - Logs when auto-toggle is attempted and when it succeeds.
   - On auto-toggle failure:
     - Logs a non-critical warning.
     - Shows a toast: informing the user that the certificate is uploaded and they may need to manually tick the checkbox if it is not auto-marked complete.

2. **Retry-Friendly UX**

   - On failures inside `handleCertificateUploadSubmit`:
     - We **do not clear the file input**, so the user can simply click "Upload & Continue" again to retry.
     - An error toast is shown using the best message available from the error.
   - Combined with the backend’s retry-aware `fetch` logic, this gives a robust manual retry path without confusing the user.

3. **Client-Side File Validation (Existing Behavior)**

   - The handler already validates:
     - File presence.
     - Maximum file size **10 MB**.
     - Non-empty file.
   - These checks prevent unnecessary network calls for obviously invalid uploads.

---

### 🧪 Testing Checklist

After these fixes, verify the following flows:

1. **Normal upload**
   - Valid certificate on a stable connection uploads, shows success toast, and auto-toggles the appropriate task (or instructs user to tick manually on rare timing issues).

2. **Slow or unstable connection**
   - Requests that exceed 30 seconds time out.
   - User sees a clear timeout message and can retry without re-selecting the file.

3. **Large or empty file**
   - Files over 10 MB or zero-length files are rejected **before** any upload is attempted.

4. **Network interruption / storage issues**
   - Partial successes (file uploaded but later error) are rolled back:
     - File removed from Supabase Storage when appropriate.
     - Certificate DB record deleted when created and subsequent steps fail.

5. **Repeat uploads / replacement**
   - Uploading a new certificate for the same course:
     - Replaces the existing record with the new file and metadata.
     - Attempts to delete the old storage object (non-critical if that delete fails).

---

### 📊 Expected Improvements

- **Reliability**: Certificate upload success rate should move from “occasionally flaky” to **highly reliable**, including on slower networks.
- **Data Integrity**: Reduced risk of orphaned files or inconsistent DB rows due to comprehensive rollback.
- **User Experience**: Clearer, more actionable error messages and a smoother auto-toggle behavior for tasks after successful uploads.

