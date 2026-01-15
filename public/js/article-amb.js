// ============================================
// ARTICLE SUBMISSION PAGE - OPTIMIZED
// ============================================

// DOM Cache for performance
const domCache = {
  elements: {},
  get(id) {
    if (!this.elements[id]) {
      this.elements[id] = document.getElementById(id);
    }
    return this.elements[id];
  },
  clear() {
    this.elements = {};
  }
};

// Toast notification system
function showToast(msg, isError = false) {
  const div = document.createElement('div');
  const icon = isError 
    ? '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
    : '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
  
  div.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slideIn ${
    isError ? 'bg-red-600' : 'bg-green-600'
  }`;
  div.innerHTML = `${icon}<span class="font-semibold">${msg}</span>`;
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

// Loading toast
let loadingToastElement = null;

function showLoadingToast(message) {
  hideLoadingToast();
  const div = document.createElement('div');
  div.id = 'loadingToast';
  div.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl bg-white border-2 border-purple-500';
  div.innerHTML = `
    <div class="flex items-center gap-3">
      <svg class="animate-spin h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <div>
        <p class="font-bold text-gray-900">${message}</p>
        <p class="text-sm text-gray-600">Please wait...</p>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  loadingToastElement = div;
}

function hideLoadingToast() {
  if (loadingToastElement) {
    loadingToastElement.remove();
    loadingToastElement = null;
  }
  const existingToast = document.getElementById('loadingToast');
  if (existingToast) existingToast.remove();
}

// Auth check with caching and better error handling
let authCache = null;
let authCacheTime = 0;
const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function checkAuth(silent = false) {
  const now = Date.now();
  if (authCache && (now - authCacheTime) < AUTH_CACHE_DURATION) {
    return Promise.resolve(authCache);
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  return fetch('/api/me', { 
    credentials: 'include',
    signal: controller.signal
  })
    .then(async r => {
      clearTimeout(timeoutId);
      // In silent mode, NEVER redirect or throw - just return null
      if (silent) {
        if (!r.ok) {
          return null; // Silently return null for any error in silent mode
        }
        return r.json().then(me => {
          if (!me || me.role !== 'ambassador') {
            return null; // Return null instead of throwing
          }
          authCache = me;
          authCacheTime = now;
          return me;
        });
      }
      
      // Non-silent mode: redirect on auth errors
      if (r.status === 401) {
        const redirectParam = encodeURIComponent(window.location.pathname);
        window.location.href = `/signin?redirect=${redirectParam}`;
        throw new Error('401');
      }
      if (r.status === 403) {
        showToast('You do not have permission to submit articles.', true);
        window.location.href = '/signin';
        throw new Error('403');
      }
      if (!r.ok) {
        // For other HTTP errors, don't redirect - might be temporary server issue
        console.warn('Auth check returned non-ok status:', r.status);
        return null;
      }
      return r.json();
    })
    .then(me => {
      if (!me) {
        // If we got null from previous step, return null
        return null;
      }
      if (me.role !== 'ambassador') {
        if (!silent) {
          showToast('You do not have permission to submit articles.', true);
          window.location.href = '/signin';
        }
        return null; // Return null instead of throwing in silent mode
      }
      authCache = me;
      authCacheTime = now;
      return me;
    })
    .catch(err => {
      clearTimeout(timeoutId);
      // In silent mode, NEVER throw - always return null
      if (silent) {
        return null;
      }
      // Handle abort/timeout errors
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        console.warn('Auth check timed out, but continuing...');
        return null; // Don't redirect on timeout
      }
      // Only redirect on actual auth failures (already handled above in non-silent mode)
      if (err.message === '401' || err.message === '403' || err.message === 'forbidden') {
        throw err; // Re-throw to let redirect happen
      }
      // For network errors or other issues, don't redirect - just log and return null
      console.warn('Auth check failed (non-critical):', err.message);
      return null; // Return null instead of redirecting
    });
}

// Rich Text Editor Functions
function formatText(command, value = null) {
  document.execCommand(command, false, value);
  domCache.get('editor')?.focus();
}

function addLink() {
  const url = prompt('Enter the URL:');
  if (url) formatText('createLink', url);
}

// Editor placeholder
function setupEditorPlaceholder() {
  const editor = domCache.get('editor');
  if (!editor) return;
  
  editor.addEventListener('focus', function() {
    if (this.innerHTML === '') {
      this.setAttribute('data-placeholder', '');
    }
  });
  
  editor.addEventListener('blur', function() {
    if (this.innerHTML === '') {
      this.setAttribute('data-placeholder', 'Start writing your article...');
    }
  });
}

// Check edit mode and load article
function checkEditModeAndLoadArticle() {
  const urlParams = new URLSearchParams(window.location.search);
  const editArticleId = urlParams.get('edit');
  
  if (!editArticleId) {
    console.log('📝 New article mode');
    return;
  }
  
  console.log('✅ Edit mode detected for article:', editArticleId);
  showToast('Loading article for editing...');
  
  // Try localStorage first (fastest)
  const savedArticle = localStorage.getItem(`article_${editArticleId}`);
  if (savedArticle) {
    try {
      const articleData = JSON.parse(savedArticle);
      populateFormWithArticle(articleData);
      showToast('Article loaded for editing');
      return;
    } catch (error) {
      console.error('❌ Error loading article from localStorage:', error);
    }
  }
  
  // Fallback to server
  fetchArticleForEditing(editArticleId);
}

// Populate form with article data
function populateFormWithArticle(articleData) {
  if (!articleData) {
    showToast('Could not load article data', true);
    return;
  }

  const titleEl = domCache.get('articleTitle');
  const editor = domCache.get('editor');
  const bylineEl = domCache.get('byline');
  
  if (titleEl && articleData.title) titleEl.value = articleData.title;
  
  if (editor) {
    const content = articleData.contentHtml || articleData.content || '';
    if (content) {
      editor.innerHTML = content;
      editor.removeAttribute('data-placeholder');
    }
  }
  
  if (bylineEl && articleData.byline) bylineEl.value = articleData.byline;
  
  // Update submit buttons
  const submitButtons = document.querySelectorAll('#submitTop, #submitBottom');
  submitButtons.forEach(btn => {
    if (btn) {
      btn.textContent = 'Update Article';
      btn.style.backgroundColor = '#dc2626';
    }
  });

  document.title = `T4L Ambassador - Edit: ${articleData.title || 'Article'}`;
}

// Fetch article from server
function fetchArticleForEditing(articleId) {
  fetch(`/api/ambassador/articles/${articleId}`, { credentials: 'include' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data.article) {
        populateFormWithArticle(data.article);
        localStorage.setItem(`article_${articleId}`, JSON.stringify(data.article));
      } else {
        throw new Error('No article data in response');
      }
    })
    .catch(error => {
      console.error('❌ Error fetching article:', error);
      showToast('Could not load article for editing. Please try again.', true);
    });
}

// Form validation
function collectAndValidate() {
  const title = (domCache.get('articleTitle')?.value || '').trim();
  const contentHtml = (domCache.get('editor')?.innerHTML || '').trim();
  const byline = (domCache.get('byline')?.value || '').trim();
  const errors = [];
  
  if (!title) errors.push('Title is required');
  const textContent = contentHtml.replace(/<[^>]*>/g, '').trim();
  if (!textContent) errors.push('Content is required');
  if (!byline) errors.push('Byline is required');
  
  return { title, contentHtml, byline, errors };
}

// Submit article (optimized)
async function submitArticle() {
  const { title, contentHtml, byline, errors } = collectAndValidate();
  if (errors.length) {
    showToast(errors[0], true);
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const editArticleId = urlParams.get('edit');
  const isEditMode = !!editArticleId;
  const endpoint = isEditMode ? `/api/ambassador/articles/${editArticleId}` : '/api/ambassador/articles';
  const method = isEditMode ? 'PATCH' : 'POST';

  // Update UI
  const submitButtons = document.querySelectorAll('#submitTop, #submitBottom');
  const originalHTML = Array.from(submitButtons).map(btn => btn.innerHTML);
  
  submitButtons.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>${isEditMode ? 'Updating...' : 'Submitting...'}</span>
      </div>
    `;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
  });

  showLoadingToast(isEditMode ? 'Updating article...' : 'Submitting article...');

  try {
    // Check auth only when submitting - not on page load
    // This allows navigation to always work
    const authResult = await checkAuth(false);
    if (!authResult) {
      // If auth check failed, show error and stop (but don't redirect on network errors)
      showToast('Please sign in to submit articles. If you are signed in, please try again.', true);
      return;
    }
    
    // For edit mode, check status
    let statusToSend = null;
    if (isEditMode) {
      try {
        const currentArticleResponse = await fetch(`/api/ambassador/articles/${editArticleId}`, {
          credentials: 'include'
        });
        if (currentArticleResponse.ok) {
          const currentArticleData = await currentArticleResponse.json();
          const currentStatus = currentArticleData.article?.status || currentArticleData.status;
          if (currentStatus === 'needs_update') {
            statusToSend = 'pending';
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch current article status:', err);
      }
    }

    // Submit
    const response = await fetch(endpoint, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        title, 
        contentHtml, 
        byline,
        ...(statusToSend && { status: statusToSend })
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        const redirectParam = encodeURIComponent(window.location.pathname);
        showToast('Please sign in to submit.', true);
        window.location.href = `/signin?redirect=${redirectParam}`;
        return;
      }
      if (response.status === 403) {
        showToast('You do not have permission to submit articles.', true);
        return;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || (isEditMode ? 'Update failed' : 'Submission failed'));
    }

    const data = await response.json();
    hideLoadingToast();
    
    const successMessage = isEditMode ? '✅ Article updated successfully!' : '✅ Article submitted for review!';
    showToast(successMessage);
    
    const articleId = isEditMode ? editArticleId : (data.id || data.article?.id || data.article?.article_id);
    
    if (articleId) {
      const articleData = {
        id: articleId,
        title,
        contentHtml,
        byline,
        status: isEditMode ? 'pending' : (data.status || data.article?.status || 'pending'),
        createdAt: Date.now(),
        updatedAt: isEditMode ? Date.now() : undefined
      };
      localStorage.setItem(`article_${articleId}`, JSON.stringify(articleData));
      localStorage.setItem('lastSubmittedArticleId', articleId);
    }
    
    setTimeout(() => {
      window.location.href = '/ambassador-review.html';
    }, 1500);
    
  } catch (err) {
    console.error('❌ Submission error:', err);
    hideLoadingToast();
    
    submitButtons.forEach((btn, index) => {
      btn.disabled = false;
      btn.innerHTML = originalHTML[index];
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });
    
    if (err && (err.message === 'Unauthorized' || err.message === 'Forbidden')) return;
    showToast(err.message || (isEditMode ? 'Update failed' : 'Submission failed'), true);
  }
}

// Logout
function setupLogout() {
  const logoutBtn = domCache.get('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '/signin')
        .catch(() => window.location.href = '/signin');
    });
  }
}

// Mobile sidebar toggle - handled by global ambassador-sidebar.js
function setupMobileMenu() {
  // No-op: Mobile menu is handled by global sidebar script
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // CRITICAL: NO AUTH CHECK ON PAGE LOAD
  // Navigation must always work - auth will be checked only on submit
  // This ensures clicking the publishing icon always works
  
  setupEditorPlaceholder();
  setupLogout();
  setupMobileMenu();
  checkEditModeAndLoadArticle();
  
  const submitTop = domCache.get('submitTop');
  const submitBottom = domCache.get('submitBottom');
  
  if (submitTop) submitTop.addEventListener('click', submitArticle);
  if (submitBottom) submitBottom.addEventListener('click', submitArticle);
  
  console.log('✅ Article page loaded - ready to use');
});

// Expose functions globally for onclick handlers
window.formatText = formatText;
window.addLink = addLink;
window.submitArticle = submitArticle;
