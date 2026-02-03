// ============================================
// AMBASSADOR DASHBOARD - VIDEO + REMINDERS (CLEAN)
// Uses /api/journey/progress for month (same as journey.html)
// ============================================

// Video configuration by journey month
const VIDEO_CONFIG = [
  { month: 1, title: "FOUNDATION", url: "https://www.canva.com/design/DAG6j1dS_Uk/Dnd2b9mJCCwSROZIWTDVXA/watch?embed", description: "Foundation Set: Onboarding complete, first course done", duration: "5:30 mins" },
  { month: 2, title: "OPTIMIZE", url: "https://www.canva.com/design/DAGymyxxfQs/vtkXrZ8joa0giowAh60-zg/watch?embed", description: "Optimized Presence: Profile updated, first article submitted", duration: "6:15 mins" },
  { month: 3, title: "ENGAGE", url: "https://www.canva.com/design/DAGym0x892o/YmDTuaFm1nNjSaJYa93ePA/watch?embed", description: "Engaged Member: Building relationships, consistent content", duration: "5:45 mins" },
  { month: 4, title: "LEAD", url: "https://www.canva.com/design/DAGymzmB9zo/Oz_eCZ8_EDoXnTeseB6R-A/watch?embed", description: "Leadership Activated: Growing visibility, all courses complete", duration: "7:00 mins" },
  { month: 5, title: "AMPLIFY", url: "https://www.canva.com/design/DAGym1aI8Gw/Sf85oXevN7qOm5zvehr9dQ/watch?embed", description: "Amplified Impact: Leading initiatives, consistent support", duration: "6:30 mins" },
  { month: 6, title: "MIDPOINT", url: "https://www.canva.com/design/DAGym9YIUZk/OIRe6vWYWkaZjWLuMomzrg/watch?embed", description: "Halfway Strong: Story shared, momentum building", duration: "8:00 mins" },
  { month: 7, title: "VISIBILITY", url: "https://www.canva.com/design/DAGym2_NkFI/NLk8fNcIBNm7mX3lT5mJGQ/watch?embed", description: "Visible Leader: Podcast prep, strong content cadence", duration: "6:45 mins" },
  { month: 8, title: "EXPAND", url: "https://www.canva.com/design/DAGzJ0qBXKM/JeRKp6jCYA88iE3RJBUvGA/watch?embed", description: "Expanded Reach: Podcast recorded, portfolio growing", duration: "7:15 mins" },
  { month: 9, title: "CONNECT", url: "https://www.canva.com/design/DAGynDXe7nM/XwF5fSUo3GJfpJBR4sO4Vg/watch?embed", description: "Connected Leader: Deep relationships, podcast live", duration: "6:00 mins" },
  { month: 10, title: "ACCELERATE", url: "https://www.canva.com/design/DAGynMCn0XU/-9LPKLzn5Zc6W5bJS8ktXQ/watch?embed", description: "Accelerating: Final articles, opportunities in pipeline", duration: "7:30 mins" },
  { month: 11, title: "CELEBRATE", url: "https://www.canva.com/design/DAGynKgil_I/FVdnkZFWNsKo1iBsbX7omg/watch?embed", description: "Celebrating: Year documented, impact quantified", duration: "8:15 mins" },
  { month: 12, title: "RENEW", url: "https://www.canva.com/design/DAGynMcNxQI/INWdK-bvAm30aMLK45OMfw/watch?embed", description: "Transformation Complete: Full year tracked, portfolio built", duration: "9:00 mins" }
];

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPostTypeIcon(postType) {
  const icons = {
    speaking: 'bx-microphone',
    podcast: 'bx-podcast',
    webinar: 'bx-video',
    volunteering: 'bx-heart',
    general: 'bx-briefcase',
  };
  return icons[(postType || '').toLowerCase()] || 'bx-briefcase';
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function validateAndFixVideoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('canva.com')) return url;
  if (url.includes('/design/')) {
    url = url.replace('/view?', '/watch?');
    if (!url.includes('/watch')) {
      url = url.replace('/design/', '/design/').replace('?embed', '/watch?embed');
    }
  }
  return url;
}

// Video handling
function showVideoError(message) {
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;

  const errorMessage =
    message || 'Unable to load video. Please try again or open the video in Canva.';

  videoContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl min-h-[16rem]">
      <i class="bx bx-error-circle text-5xl text-red-500 mb-4"></i>
      <p class="text-gray-700 font-medium mb-2">Video Loading Error</p>
      <p class="text-gray-500 text-sm text-center mb-4 max-w-md">${escapeHtml(
        errorMessage,
      )}</p>
      <button onclick="loadCurrentMonthVideo()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
        <i class="bx bx-refresh mr-2"></i> Retry
      </button>
    </div>
  `;
}

async function loadCurrentMonthVideo() {
  try {
    console.log('🎥 Loading journey video based on /api/journey/progress...');

    const response = await fetch('/api/journey/progress', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const journeyData = await response.json();
    const currentMonth = journeyData.currentMonth || 1;

    console.log('✅ Journey month for video:', currentMonth);

    const currentVideo = VIDEO_CONFIG.find((v) => v.month === currentMonth);
    if (!currentVideo) {
      throw new Error(`No video configured for Month ${currentMonth}`);
    }

    const validatedUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!validatedUrl) {
      throw new Error('Invalid video URL');
    }

    window.currentVideo = { ...currentVideo, url: validatedUrl };

    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    const videoMeta = document.getElementById('videoMeta');

    if (videoTitle) {
      // Show simple label in header: "Video Month X"
      videoTitle.textContent = `Video Month ${currentMonth}`;
    }
    if (videoDescription) {
      videoDescription.textContent = currentVideo.description;
    }
    if (videoMeta) {
      videoMeta.textContent = `${currentVideo.duration} • Month ${currentMonth}`;
    }

    let embedUrl = validatedUrl;
    if (embedUrl.includes('canva.com')) {
      const [baseUrl, query = ''] = embedUrl.split('?');
      const params = new URLSearchParams(query);
      if (!params.has('embed')) params.append('embed', '');
      params.set('autoplay', '1');
      params.delete('muted');
      embedUrl = `${baseUrl}?${params.toString()}`;
    }

    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) {
      console.warn('videoContainer not found');
      return;
    }

    videoContainer.innerHTML = `
      <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #fdf4ff;">
        <iframe
          id="canvaVideoFrame"
          class="absolute top-0 left-0 w-full h-full border-0"
          src="${embedUrl}"
          allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
          allowfullscreen
          frameborder="0"
          title="Month ${currentMonth}: ${currentVideo.title}"
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
        </iframe>
      </div>
    `;

    console.log('✅ Journey video iframe inserted');
  } catch (error) {
    console.error('❌ Error loading journey video:', error);
    showVideoError(error.message || 'Failed to load video');
  }
}

// Partner calls
async function loadPartnerCalls() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (!partnerCallsContainer) return;

    const posts = data.posts || [];
    const latestPosts = posts.slice(0, 2);

    if (latestPosts.length === 0) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-info-circle text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-500 text-sm">No visibility opportunities available yet</p>
        </div>
      `;
      return;
    }

    partnerCallsContainer.innerHTML = latestPosts
      .map((post) => {
        const formattedDate = formatDate(post.created_at);
        const icon = getPostTypeIcon(post.category);
        const title = escapeHtml(post.title || 'Visibility Opportunity');
        const content = escapeHtml(post.content || '');

        return `
          <a href="/Partner-Calls.html" class="block">
            <div class="border border-gray-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
              <div class="flex items-start gap-3">
                <div class="bg-purple-100 rounded-xl p-2 flex-shrink-0">
                  <i class="bx ${icon} text-purple-600 text-xl"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-gray-900 text-sm mb-1 truncate">${title}</p>
                  <p class="text-xs text-gray-500 mb-1">${formattedDate} • ${escapeHtml(
                    post.category || 'General',
                  )}</p>
                  <p class="text-xs text-gray-600 line-clamp-2">${content}</p>
                </div>
              </div>
            </div>
          </a>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading partner calls:', error);
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (partnerCallsContainer) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-error-circle text-4xl text-red-400 mb-2"></i>
          <p class="text-gray-500 text-sm">Unable to load visibility opportunities</p>
          <button onclick="loadPartnerCalls()" class="mt-2 text-purple-600 text-xs font-medium hover:text-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Daily reminder
function showDailyReminder(motivationalMessage, taskName) {
  const popup = document.getElementById('dailyReminderPopup');
  const messageEl = document.getElementById('dailyReminderMessage');
  const taskEl = document.getElementById('dailyReminderTaskName');

  if (!popup) return;

  if (
    typeof motivationalMessage === 'string' &&
    motivationalMessage.includes('Remember why you started')
  ) {
    motivationalMessage = '💪 Keep pushing forward!';
  }

  if (messageEl) messageEl.textContent = motivationalMessage;
  if (taskEl) taskEl.textContent = taskName;

  popup.classList.remove('hidden');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDailyReminder() {
  const popup = document.getElementById('dailyReminderPopup');
  if (!popup) return;

  popup.classList.remove('active');
  popup.classList.add('hidden');
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';

  const today = new Date().toDateString();
  localStorage.setItem('dailyReminderSeen', today);
  localStorage.setItem('dailyReminderLastShown', Date.now().toString());
}

async function checkDailyReminder() {
  try {
    const lastReminderTime = localStorage.getItem('dailyReminderLastShown');
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (lastReminderTime && now - parseInt(lastReminderTime, 10) < twoHoursMs) {
      console.log('⏰ Daily reminder skipped (recently shown)');
      return;
    }

    const response = await fetch('/api/journey/daily-reminder', {
      credentials: 'include',
    });
    if (!response.ok) return;

    const data = await response.json();
    if (data.hasReminder) {
      setTimeout(() => {
        showDailyReminder(data.motivationalMessage, data.taskName);
        localStorage.setItem('dailyReminderLastShown', Date.now().toString());
      }, 1500);
    }
  } catch (error) {
    console.warn('Failed to check daily reminder:', error);
  }
}

// Initialization
async function initializeDashboard() {
  try {
    console.log('🚀 Initializing ambassador dashboard (video + partner calls + reminder)...');

    await loadCurrentMonthVideo();
    loadPartnerCalls();
    checkDailyReminder();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Basic user info for header
  fetch('/api/me', {
    credentials: 'include',
    headers: { 'Cache-Control': 'no-cache' },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      const welcomeHeading = document.getElementById('welcomeHeading');
      const avatarElement = document.getElementById('userAvatar');
      if (welcomeHeading && data.name) {
        welcomeHeading.textContent = `Welcome, ${data.name}!`;
      }
      if (avatarElement && data.name) {
        const initials = data.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        avatarElement.textContent = initials;
      }
    })
    .catch(() => {});

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => (window.location.href = '/signin'))
        .catch(() => (window.location.href = '/signin'));
    });
  }

  // Close reminder when clicking outside
  const popup = document.getElementById('dailyReminderPopup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closeDailyReminder();
    });
  }

  initializeDashboard();
});

// Expose for HTML onclick/debug
window.loadCurrentMonthVideo = loadCurrentMonthVideo;
window.loadPartnerCalls = loadPartnerCalls;
window.closeDailyReminder = closeDailyReminder;

console.log('✅ ambassador-dashboard.js loaded (video from /api/journey/progress)');

// ============================================
// AMBASSADOR DASHBOARD - CLEAN VIDEO + REMINDERS
// Works alongside ambassador-dashboard-stats-fix.js
// ============================================

// Video configuration by journey month
const VIDEO_CONFIG = [
  { month: 1, title: "FOUNDATION", url: "https://www.canva.com/design/DAG6j1dS_Uk/Dnd2b9mJCCwSROZIWTDVXA/watch?embed", description: "Foundation Set: Onboarding complete, first course done", duration: "5:30 mins" },
  { month: 2, title: "OPTIMIZE", url: "https://www.canva.com/design/DAGymyxxfQs/vtkXrZ8joa0giowAh60-zg/watch?embed", description: "Optimized Presence: Profile updated, first article submitted", duration: "6:15 mins" },
  { month: 3, title: "ENGAGE", url: "https://www.canva.com/design/DAGym0x892o/YmDTuaFm1nNjSaJYa93ePA/watch?embed", description: "Engaged Member: Building relationships, consistent content", duration: "5:45 mins" },
  { month: 4, title: "LEAD", url: "https://www.canva.com/design/DAGymzmB9zo/Oz_eCZ8_EDoXnTeseB6R-A/watch?embed", description: "Leadership Activated: Growing visibility, all courses complete", duration: "7:00 mins" },
  { month: 5, title: "AMPLIFY", url: "https://www.canva.com/design/DAGym1aI8Gw/Sf85oXevN7qOm5zvehr9dQ/watch?embed", description: "Amplified Impact: Leading initiatives, consistent support", duration: "6:30 mins" },
  { month: 6, title: "MIDPOINT", url: "https://www.canva.com/design/DAGym9YIUZk/OIRe6vWYWkaZjWLuMomzrg/watch?embed", description: "Halfway Strong: Story shared, momentum building", duration: "8:00 mins" },
  { month: 7, title: "VISIBILITY", url: "https://www.canva.com/design/DAGym2_NkFI/NLk8fNcIBNm7mX3lT5mJGQ/watch?embed", description: "Visible Leader: Podcast prep, strong content cadence", duration: "6:45 mins" },
  { month: 8, title: "EXPAND", url: "https://www.canva.com/design/DAGzJ0qBXKM/JeRKp6jCYA88iE3RJBUvGA/watch?embed", description: "Expanded Reach: Podcast recorded, portfolio growing", duration: "7:15 mins" },
  { month: 9, title: "CONNECT", url: "https://www.canva.com/design/DAGynDXe7nM/XwF5fSUo3GJfpJBR4sO4Vg/watch?embed", description: "Connected Leader: Deep relationships, podcast live", duration: "6:00 mins" },
  { month: 10, title: "ACCELERATE", url: "https://www.canva.com/design/DAGynMCn0XU/-9LPKLzn5Zc6W5bJS8ktXQ/watch?embed", description: "Accelerating: Final articles, opportunities in pipeline", duration: "7:30 mins" },
  { month: 11, title: "CELEBRATE", url: "https://www.canva.com/design/DAGynKgil_I/FVdnkZFWNsKo1iBsbX7omg/watch?embed", description: "Celebrating: Year documented, impact quantified", duration: "8:15 mins" },
  { month: 12, title: "RENEW", url: "https://www.canva.com/design/DAGynMcNxQI/INWdK-bvAm30aMLK45OMfw/watch?embed", description: "Transformation Complete: Full year tracked, portfolio built", duration: "9:00 mins" }
];

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPostTypeIcon(postType) {
  const icons = {
    speaking: 'bx-microphone',
    podcast: 'bx-podcast',
    webinar: 'bx-video',
    volunteering: 'bx-heart',
    general: 'bx-briefcase',
  };
  return icons[(postType || '').toLowerCase()] || 'bx-briefcase';
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function validateAndFixVideoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('canva.com')) return url;
  if (url.includes('/design/')) {
    url = url.replace('/view?', '/watch?');
    if (!url.includes('/watch')) {
      url = url.replace('/design/', '/design/').replace('?embed', '/watch?embed');
    }
  }
  return url;
}

// Video handling
function showVideoError(message) {
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;

  const errorMessage =
    message || 'Unable to load video. Please try again or open the video in Canva.';

  videoContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl min-h-[16rem]">
      <i class="bx bx-error-circle text-5xl text-red-500 mb-4"></i>
      <p class="text-gray-700 font-medium mb-2">Video Loading Error</p>
      <p class="text-gray-500 text-sm text-center mb-4 max-w-md">${escapeHtml(
        errorMessage,
      )}</p>
      <button onclick="loadCurrentMonthVideo()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
        <i class="bx bx-refresh mr-2"></i> Retry
      </button>
    </div>
  `;
}

async function loadCurrentMonthVideo() {
  try {
    console.log('🎥 Loading journey video based on /api/journey/progress...');

    const response = await fetch('/api/journey/progress', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const journeyData = await response.json();
    const currentMonth = journeyData.currentMonth || 1;

    console.log('✅ Journey month for video:', currentMonth);

    const currentVideo = VIDEO_CONFIG.find((v) => v.month === currentMonth);
    if (!currentVideo) {
      throw new Error(`No video configured for Month ${currentMonth}`);
    }

    const validatedUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!validatedUrl) {
      throw new Error('Invalid video URL');
    }

    window.currentVideo = { ...currentVideo, url: validatedUrl };

    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    const videoMeta = document.getElementById('videoMeta');

    if (videoTitle) {
      videoTitle.textContent = `Month ${currentMonth}: ${currentVideo.title}`;
    }
    if (videoDescription) {
      videoDescription.textContent = currentVideo.description;
    }
    if (videoMeta) {
      videoMeta.textContent = `${currentVideo.duration} • Month ${currentMonth}`;
    }

    let embedUrl = validatedUrl;
    if (embedUrl.includes('canva.com')) {
      const [baseUrl, query = ''] = embedUrl.split('?');
      const params = new URLSearchParams(query);
      if (!params.has('embed')) params.append('embed', '');
      params.set('autoplay', '1');
      params.delete('muted');
      embedUrl = `${baseUrl}?${params.toString()}`;
    }

    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) {
      console.warn('videoContainer not found');
      return;
    }

    videoContainer.innerHTML = `
      <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #000;">
        <iframe
          id="canvaVideoFrame"
          class="absolute top-0 left-0 w-full h-full border-0"
          src="${embedUrl}"
          allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
          allowfullscreen
          frameborder="0"
          title="Month ${currentMonth}: ${currentVideo.title}"
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
        </iframe>
      </div>
    `;

    console.log('✅ Journey video iframe inserted');
  } catch (error) {
    console.error('❌ Error loading journey video:', error);
    showVideoError(error.message || 'Failed to load video');
  }
}

// Partner calls
async function loadPartnerCalls() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (!partnerCallsContainer) return;

    const posts = data.posts || [];
    const latestPosts = posts.slice(0, 2);

    if (latestPosts.length === 0) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-info-circle text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-500 text-sm">No visibility opportunities available yet</p>
        </div>
      `;
      return;
    }

    partnerCallsContainer.innerHTML = latestPosts
      .map((post) => {
        const formattedDate = formatDate(post.created_at);
        const icon = getPostTypeIcon(post.category);
        const title = escapeHtml(post.title || 'Visibility Opportunity');
        const content = escapeHtml(post.content || '');

        return `
          <a href="/Partner-Calls.html" class="block">
            <div class="border border-gray-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
              <div class="flex items-start gap-3">
                <div class="bg-purple-100 rounded-xl p-2 flex-shrink-0">
                  <i class="bx ${icon} text-purple-600 text-xl"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-gray-900 text-sm mb-1 truncate">${title}</p>
                  <p class="text-xs text-gray-500 mb-1">${formattedDate} • ${escapeHtml(
                    post.category || 'General',
                  )}</p>
                  <p class="text-xs text-gray-600 line-clamp-2">${content}</p>
                </div>
              </div>
            </div>
          </a>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading partner calls:', error);
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (partnerCallsContainer) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-error-circle text-4xl text-red-400 mb-2"></i>
          <p class="text-gray-500 text-sm">Unable to load visibility opportunities</p>
          <button onclick="loadPartnerCalls()" class="mt-2 text-purple-600 text-xs font-medium hover:text-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Daily reminder
function showDailyReminder(motivationalMessage, taskName) {
  const popup = document.getElementById('dailyReminderPopup');
  const messageEl = document.getElementById('dailyReminderMessage');
  const taskEl = document.getElementById('dailyReminderTaskName');

  if (!popup) return;

  if (
    typeof motivationalMessage === 'string' &&
    motivationalMessage.includes('Remember why you started')
  ) {
    motivationalMessage = '💪 Keep pushing forward!';
  }

  if (messageEl) messageEl.textContent = motivationalMessage;
  if (taskEl) taskEl.textContent = taskName;

  popup.classList.remove('hidden');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDailyReminder() {
  const popup = document.getElementById('dailyReminderPopup');
  if (!popup) return;

  popup.classList.remove('active');
  popup.classList.add('hidden');
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';

  const today = new Date().toDateString();
  localStorage.setItem('dailyReminderSeen', today);
  localStorage.setItem('dailyReminderLastShown', Date.now().toString());
}

async function checkDailyReminder() {
  try {
    const lastReminderTime = localStorage.getItem('dailyReminderLastShown');
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (lastReminderTime && now - parseInt(lastReminderTime, 10) < twoHoursMs) {
      console.log('⏰ Daily reminder skipped (recently shown)');
      return;
    }

    const response = await fetch('/api/journey/daily-reminder', {
      credentials: 'include',
    });
    if (!response.ok) return;

    const data = await response.json();
    if (data.hasReminder) {
      setTimeout(() => {
        showDailyReminder(data.motivationalMessage, data.taskName);
        localStorage.setItem('dailyReminderLastShown', Date.now().toString());
      }, 1500);
    }
  } catch (error) {
    console.warn('Failed to check daily reminder:', error);
  }
}

// Initialization
async function initializeDashboard() {
  try {
    console.log('🚀 Initializing ambassador dashboard (video + partner calls + reminder)...');

    await loadCurrentMonthVideo();
    loadPartnerCalls();
    checkDailyReminder();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Basic user info for header
  fetch('/api/me', {
    credentials: 'include',
    headers: { 'Cache-Control': 'no-cache' },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      const welcomeHeading = document.getElementById('welcomeHeading');
      const avatarElement = document.getElementById('userAvatar');
      if (welcomeHeading && data.name) {
        welcomeHeading.textContent = `Welcome, ${data.name}!`;
      }
      if (avatarElement && data.name) {
        const initials = data.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        avatarElement.textContent = initials;
      }
    })
    .catch(() => {});

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => (window.location.href = '/signin'))
        .catch(() => (window.location.href = '/signin'));
    });
  }

  // Close reminder when clicking outside
  const popup = document.getElementById('dailyReminderPopup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closeDailyReminder();
    });
  }

  initializeDashboard();
});

// Expose for HTML onclick/debug
window.loadCurrentMonthVideo = loadCurrentMonthVideo;
window.loadPartnerCalls = loadPartnerCalls;
window.closeDailyReminder = closeDailyReminder;

console.log('✅ ambassador-dashboard.js loaded (video from /api/journey/progress)');

// ============================================
// AMBASSADOR DASHBOARD - CLEAN VIDEO + REMINDERS
// Works alongside ambassador-dashboard-stats-fix.js
// ============================================

// Video configuration by journey month
const VIDEO_CONFIG = [
  { month: 1, title: "FOUNDATION", url: "https://www.canva.com/design/DAG6j1dS_Uk/Dnd2b9mJCCwSROZIWTDVXA/watch?embed", description: "Foundation Set: Onboarding complete, first course done", duration: "5:30 mins" },
  { month: 2, title: "OPTIMIZE", url: "https://www.canva.com/design/DAGymyxxfQs/vtkXrZ8joa0giowAh60-zg/watch?embed", description: "Optimized Presence: Profile updated, first article submitted", duration: "6:15 mins" },
  { month: 3, title: "ENGAGE", url: "https://www.canva.com/design/DAGym0x892o/YmDTuaFm1nNjSaJYa93ePA/watch?embed", description: "Engaged Member: Building relationships, consistent content", duration: "5:45 mins" },
  { month: 4, title: "LEAD", url: "https://www.canva.com/design/DAGymzmB9zo/Oz_eCZ8_EDoXnTeseB6R-A/watch?embed", description: "Leadership Activated: Growing visibility, all courses complete", duration: "7:00 mins" },
  { month: 5, title: "AMPLIFY", url: "https://www.canva.com/design/DAGym1aI8Gw/Sf85oXevN7qOm5zvehr9dQ/watch?embed", description: "Amplified Impact: Leading initiatives, consistent support", duration: "6:30 mins" },
  { month: 6, title: "MIDPOINT", url: "https://www.canva.com/design/DAGym9YIUZk/OIRe6vWYWkaZjWLuMomzrg/watch?embed", description: "Halfway Strong: Story shared, momentum building", duration: "8:00 mins" },
  { month: 7, title: "VISIBILITY", url: "https://www.canva.com/design/DAGym2_NkFI/NLk8fNcIBNm7mX3lT5mJGQ/watch?embed", description: "Visible Leader: Podcast prep, strong content cadence", duration: "6:45 mins" },
  { month: 8, title: "EXPAND", url: "https://www.canva.com/design/DAGzJ0qBXKM/JeRKp6jCYA88iE3RJBUvGA/watch?embed", description: "Expanded Reach: Podcast recorded, portfolio growing", duration: "7:15 mins" },
  { month: 9, title: "CONNECT", url: "https://www.canva.com/design/DAGynDXe7nM/XwF5fSUo3GJfpJBR4sO4Vg/watch?embed", description: "Connected Leader: Deep relationships, podcast live", duration: "6:00 mins" },
  { month: 10, title: "ACCELERATE", url: "https://www.canva.com/design/DAGynMCn0XU/-9LPKLzn5Zc6W5bJS8ktXQ/watch?embed", description: "Accelerating: Final articles, opportunities in pipeline", duration: "7:30 mins" },
  { month: 11, title: "CELEBRATE", url: "https://www.canva.com/design/DAGynKgil_I/FVdnkZFWNsKo1iBsbX7omg/watch?embed", description: "Celebrating: Year documented, impact quantified", duration: "8:15 mins" },
  { month: 12, title: "RENEW", url: "https://www.canva.com/design/DAGynMcNxQI/INWdK-bvAm30aMLK45OMfw/watch?embed", description: "Transformation Complete: Full year tracked, portfolio built", duration: "9:00 mins" }
];

// --------------------------------------------
// Helpers
// --------------------------------------------

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPostTypeIcon(postType) {
  const icons = {
    speaking: 'bx-microphone',
    podcast: 'bx-podcast',
    webinar: 'bx-video',
    volunteering: 'bx-heart',
    general: 'bx-briefcase',
  };
  return icons[(postType || '').toLowerCase()] || 'bx-briefcase';
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function validateAndFixVideoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('canva.com')) return url;
  if (url.includes('/design/')) {
    url = url.replace('/view?', '/watch?');
    if (!url.includes('/watch')) {
      url = url.replace('/design/', '/design/').replace('?embed', '/watch?embed');
    }
  }
  return url;
}

// --------------------------------------------
// Video handling
// --------------------------------------------

function showVideoError(message) {
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;

  const errorMessage =
    message || 'Unable to load video. Please try again or open the video in Canva.';

  videoContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl min-h-[16rem]">
      <i class="bx bx-error-circle text-5xl text-red-500 mb-4"></i>
      <p class="text-gray-700 font-medium mb-2">Video Loading Error</p>
      <p class="text-gray-500 text-sm text-center mb-4 max-w-md">${escapeHtml(
        errorMessage,
      )}</p>
      <button onclick="loadCurrentMonthVideo()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
        <i class="bx bx-refresh mr-2"></i> Retry
      </button>
    </div>
  `;
}

async function loadCurrentMonthVideo() {
  try {
    console.log('🎥 Loading journey video based on /api/journey/progress...');

    // Get current month directly from the same API as journey.html
    const response = await fetch('/api/journey/progress', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const journeyData = await response.json();
    const currentMonth = journeyData.currentMonth || 1;

    console.log('✅ Journey month for video:', currentMonth);

    const currentVideo = VIDEO_CONFIG.find((v) => v.month === currentMonth);
    if (!currentVideo) {
      throw new Error(`No video configured for Month ${currentMonth}`);
    }

    const validatedUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!validatedUrl) {
      throw new Error('Invalid video URL');
    }

    window.currentVideo = { ...currentVideo, url: validatedUrl };

    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    const videoMeta = document.getElementById('videoMeta');

    if (videoTitle) {
      videoTitle.textContent = `Month ${currentMonth}: ${currentVideo.title}`;
    }
    if (videoDescription) {
      videoDescription.textContent = currentVideo.description;
    }
    if (videoMeta) {
      videoMeta.textContent = `${currentVideo.duration} • Month ${currentMonth}`;
    }

    let embedUrl = validatedUrl;
    if (embedUrl.includes('canva.com')) {
      const [baseUrl, query = ''] = embedUrl.split('?');
      const params = new URLSearchParams(query);
      if (!params.has('embed')) params.append('embed', '');
      params.set('autoplay', '1');
      params.delete('muted');
      embedUrl = `${baseUrl}?${params.toString()}`;
    }

    const videoContainer = document.getElementById('videoContainer');
    if (!videoContainer) {
      console.warn('videoContainer not found');
      return;
    }

    videoContainer.innerHTML = `
      <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #000;">
        <iframe
          id="canvaVideoFrame"
          class="absolute top-0 left-0 w-full h-full border-0"
          src="${embedUrl}"
          allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
          allowfullscreen
          frameborder="0"
          title="Month ${currentMonth}: ${currentVideo.title}"
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
        </iframe>
      </div>
    `;

    console.log('✅ Journey video iframe inserted');
  } catch (error) {
    console.error('❌ Error loading journey video:', error);
    showVideoError(error.message || 'Failed to load video');
  }
}

// --------------------------------------------
// Partner calls
// --------------------------------------------

async function loadPartnerCalls() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (!partnerCallsContainer) return;

    const posts = data.posts || [];
    const latestPosts = posts.slice(0, 2);

    if (latestPosts.length === 0) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-info-circle text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-500 text-sm">No visibility opportunities available yet</p>
        </div>
      `;
      return;
    }

    partnerCallsContainer.innerHTML = latestPosts
      .map((post) => {
        const formattedDate = formatDate(post.created_at);
        const icon = getPostTypeIcon(post.category);
        const title = escapeHtml(post.title || 'Visibility Opportunity');
        const content = escapeHtml(post.content || '');

        return `
          <a href="/Partner-Calls.html" class="block">
            <div class="border border-gray-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
              <div class="flex items-start gap-3">
                <div class="bg-purple-100 rounded-xl p-2 flex-shrink-0">
                  <i class="bx ${icon} text-purple-600 text-xl"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-gray-900 text-sm mb-1 truncate">${title}</p>
                  <p class="text-xs text-gray-500 mb-1">${formattedDate} • ${escapeHtml(
                    post.category || 'General',
                  )}</p>
                  <p class="text-xs text-gray-600 line-clamp-2">${content}</p>
                </div>
              </div>
            </div>
          </a>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading partner calls:', error);
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (partnerCallsContainer) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-error-circle text-4xl text-red-400 mb-2"></i>
          <p class="text-gray-500 text-sm">Unable to load visibility opportunities</p>
          <button onclick="loadPartnerCalls()" class="mt-2 text-purple-600 text-xs font-medium hover:text-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// --------------------------------------------
// Daily reminder
// --------------------------------------------

function showDailyReminder(motivationalMessage, taskName) {
  const popup = document.getElementById('dailyReminderPopup');
  const messageEl = document.getElementById('dailyReminderMessage');
  const taskEl = document.getElementById('dailyReminderTaskName');

  if (!popup) return;

  if (
    typeof motivationalMessage === 'string' &&
    motivationalMessage.includes('Remember why you started')
  ) {
    motivationalMessage = '💪 Keep pushing forward!';
  }

  if (messageEl) messageEl.textContent = motivationalMessage;
  if (taskEl) taskEl.textContent = taskName;

  popup.classList.remove('hidden');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDailyReminder() {
  const popup = document.getElementById('dailyReminderPopup');
  if (!popup) return;

  popup.classList.remove('active');
  popup.classList.add('hidden');
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';

  const today = new Date().toDateString();
  localStorage.setItem('dailyReminderSeen', today);
  localStorage.setItem('dailyReminderLastShown', Date.now().toString());
}

async function checkDailyReminder() {
  try {
    const lastReminderTime = localStorage.getItem('dailyReminderLastShown');
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (lastReminderTime && now - parseInt(lastReminderTime, 10) < twoHoursMs) {
      console.log('⏰ Daily reminder skipped (recently shown)');
      return;
    }

    const response = await fetch('/api/journey/daily-reminder', {
      credentials: 'include',
    });
    if (!response.ok) return;

    const data = await response.json();
    if (data.hasReminder) {
      setTimeout(() => {
        showDailyReminder(data.motivationalMessage, data.taskName);
        localStorage.setItem('dailyReminderLastShown', Date.now().toString());
      }, 1500);
    }
  } catch (error) {
    console.warn('Failed to check daily reminder:', error);
  }
}

// --------------------------------------------
// Initialization
// --------------------------------------------

async function initializeDashboard() {
  try {
    console.log('🚀 Initializing ambassador dashboard (video + partner calls + reminder)...');

    // Wait briefly so stats script can update DOM, but video does NOT depend on it
    await new Promise((resolve) => setTimeout(resolve, 500));

    await loadCurrentMonthVideo();
    loadPartnerCalls();
    checkDailyReminder();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Basic user info for header
  fetch('/api/me', {
    credentials: 'include',
    headers: { 'Cache-Control': 'no-cache' },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      const welcomeHeading = document.getElementById('welcomeHeading');
      const avatarElement = document.getElementById('userAvatar');
      if (welcomeHeading && data.name) {
        welcomeHeading.textContent = `Welcome, ${data.name}!`;
      }
      if (avatarElement && data.name) {
        const initials = data.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        avatarElement.textContent = initials;
      }
    })
    .catch(() => {});

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => (window.location.href = '/signin'))
        .catch(() => (window.location.href = '/signin'));
    });
  }

  // Close reminder when clicking outside
  const popup = document.getElementById('dailyReminderPopup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closeDailyReminder();
    });
  }

  initializeDashboard();
});

// Expose for HTML onclick/debug
window.loadCurrentMonthVideo = loadCurrentMonthVideo;
window.loadPartnerCalls = loadPartnerCalls;
window.closeDailyReminder = closeDailyReminder;

console.log('✅ ambassador-dashboard.js loaded (clean version, video from /api/journey/progress)');

// ============================================
// AMBASSADOR DASHBOARD - CLEAN VERSION
// Works with ambassador-dashboard-stats-fix.js
// ============================================

// Video configuration
const VIDEO_CONFIG = [
  { month: 1, title: "FOUNDATION", url: "https://www.canva.com/design/DAG6j1dS_Uk/Dnd2b9mJCCwSROZIWTDVXA/watch?embed", description: "Foundation Set: Onboarding complete, first course done", duration: "5:30 mins" },
  { month: 2, title: "OPTIMIZE", url: "https://www.canva.com/design/DAGymyxxfQs/vtkXrZ8joa0giowAh60-zg/watch?embed", description: "Optimized Presence: Profile updated, first article submitted", duration: "6:15 mins" },
  { month: 3, title: "ENGAGE", url: "https://www.canva.com/design/DAGym0x892o/YmDTuaFm1nNjSaJYa93ePA/watch?embed", description: "Engaged Member: Building relationships, consistent content", duration: "5:45 mins" },
  { month: 4, title: "LEAD", url: "https://www.canva.com/design/DAGymzmB9zo/Oz_eCZ8_EDoXnTeseB6R-A/watch?embed", description: "Leadership Activated: Growing visibility, all courses complete", duration: "7:00 mins" },
  { month: 5, title: "AMPLIFY", url: "https://www.canva.com/design/DAGym1aI8Gw/Sf85oXevN7qOm5zvehr9dQ/watch?embed", description: "Amplified Impact: Leading initiatives, consistent support", duration: "6:30 mins" },
  { month: 6, title: "MIDPOINT", url: "https://www.canva.com/design/DAGym9YIUZk/OIRe6vWYWkaZjWLuMomzrg/watch?embed", description: "Halfway Strong: Story shared, momentum building", duration: "8:00 mins" },
  { month: 7, title: "VISIBILITY", url: "https://www.canva.com/design/DAGym2_NkFI/NLk8fNcIBNm7mX3lT5mJGQ/watch?embed", description: "Visible Leader: Podcast prep, strong content cadence", duration: "6:45 mins" },
  { month: 8, title: "EXPAND", url: "https://www.canva.com/design/DAGzJ0qBXKM/JeRKp6jCYA88iE3RJBUvGA/watch?embed", description: "Expanded Reach: Podcast recorded, portfolio growing", duration: "7:15 mins" },
  { month: 9, title: "CONNECT", url: "https://www.canva.com/design/DAGynDXe7nM/XwF5fSUo3GJfpJBR4sO4Vg/watch?embed", description: "Connected Leader: Deep relationships, podcast live", duration: "6:00 mins" },
  { month: 10, title: "ACCELERATE", url: "https://www.canva.com/design/DAGynMCn0XU/-9LPKLzn5Zc6W5bJS8ktXQ/watch?embed", description: "Accelerating: Final articles, opportunities in pipeline", duration: "7:30 mins" },
  { month: 11, title: "CELEBRATE", url: "https://www.canva.com/design/DAGynKgil_I/FVdnkZFWNsKo1iBsbX7omg/watch?embed", description: "Celebrating: Year documented, impact quantified", duration: "8:15 mins" },
  { month: 12, title: "RENEW", url: "https://www.canva.com/design/DAGynMcNxQI/INWdK-bvAm30aMLK45OMfw/watch?embed", description: "Transformation Complete: Full year tracked, portfolio built", duration: "9:00 mins" }
];

// Helper functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPostTypeIcon(postType) {
  const icons = {
    'speaking': 'bx-microphone',
    'podcast': 'bx-podcast',
    'webinar': 'bx-video',
    'volunteering': 'bx-heart',
    'general': 'bx-briefcase'
  };
  return icons[postType?.toLowerCase()] || 'bx-briefcase';
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return 'Recently';
  }
}

function validateAndFixVideoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('canva.com')) return url;
  if (url.includes('/design/')) {
    url = url.replace('/view?', '/watch?');
    if (!url.includes('/watch')) {
      url = url.replace('/design/', '/design/').replace('?embed', '/watch?embed');
    }
  }
  return url;
}

// ============================================
// VIDEO LOADING - Uses data from stats fix
// ============================================

function showVideoError(message = null) {
  const videoContainer = document.getElementById('videoContainer');
  const currentVideo = window.currentVideo;
  
  if (videoContainer) {
    const errorMessage = message || 'Unable to load video. Please try again or open the video directly in Canva.';
    videoContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl min-h-[16rem]">
        <i class="bx bx-error-circle text-5xl text-red-500 mb-4"></i>
        <p class="text-gray-700 font-medium mb-2">Video Loading Error</p>
        <p class="text-gray-500 text-sm text-center mb-4 max-w-md">${errorMessage}</p>
        <div class="flex flex-col sm:flex-row gap-3 mt-4">
          <button onclick="loadCurrentMonthVideo()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
            <i class="bx bx-refresh mr-2"></i> Retry
          </button>
          ${currentVideo && currentVideo.url ? `
            <a href="${currentVideo.url.replace(/\/watch\?embed/, '/view').replace(/\/watch\?/, '/view?')}" target="_blank" 
               class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <i class="bx bx-link-external mr-2"></i> Open in Canva
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }
}

async function loadCurrentMonthVideo() {
  try {
    console.log('🎥 Loading video based on dashboard stats...');
    
    // Get current month from the dashboard stats (set by ambassador-dashboard-stats-fix.js)
    const journeyMonthElement = document.getElementById('journeyMonth');
    if (!journeyMonthElement) {
      throw new Error('Journey month element not found');
    }
    
    const journeyMonthText = journeyMonthElement.textContent; // e.g., "Month 3 of 12"
    const match = journeyMonthText.match(/Month (\d+)/);
    
    if (!match) {
      throw new Error('Could not parse month from journey stats');
    }
    
    const currentMonth = parseInt(match[1]);
    console.log('📊 Current month from dashboard:', currentMonth);
    
    // Find the video for this month
    const currentVideo = VIDEO_CONFIG.find(v => v.month === currentMonth);
    
    if (!currentVideo) {
      throw new Error(`No video found for Month ${currentMonth}`);
    }
    
    console.log('✅ Found video:', currentVideo.title);
    
    // Validate URL
    const validatedUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!validatedUrl) {
      throw new Error('Invalid video URL');
    }
    
    // Store globally
    window.currentVideo = { ...currentVideo, url: validatedUrl };
    
    // Update text elements
    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    const videoMeta = document.getElementById('videoMeta');
    
    if (videoTitle) videoTitle.textContent = `Month ${currentMonth}: ${currentVideo.title}`;
    if (videoDescription) videoDescription.textContent = currentVideo.description;
    if (videoMeta) videoMeta.textContent = `${currentVideo.duration} • Month ${currentMonth}`;
    
    // Build embed URL with autoplay
    let embedUrl = validatedUrl;
    if (embedUrl.includes('canva.com')) {
      const urlParts = embedUrl.split('?');
      const baseUrl = urlParts[0];
      const params = new URLSearchParams(urlParts[1] || '');
      if (!params.has('embed')) params.append('embed', '');
      params.set('autoplay', '1');
      params.delete('muted');
      embedUrl = baseUrl + '?' + params.toString();
    }
    
    // Insert video iframe
    const videoContainer = document.getElementById('videoContainer');
    if (videoContainer) {
      videoContainer.innerHTML = `
        <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #000;">
          <iframe 
            id="canvaVideoFrame"
            class="absolute top-0 left-0 w-full h-full border-0"
            src="${embedUrl}"
            allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
            allowfullscreen
            frameborder="0"
            title="Month ${currentMonth}: ${currentVideo.title}"
            loading="eager"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
          </iframe>
        </div>
      `;
      
      console.log('✅ Video loaded successfully');
    }
    
  } catch (error) {
    console.error('❌ Error loading video:', error);
    showVideoError(error.message || 'Failed to load video');
  }
}

// ============================================
// PARTNER CALLS
// ============================================

async function loadPartnerCalls() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (!partnerCallsContainer) return;
    
    const posts = data.posts || [];
    const latestPosts = posts.slice(0, 2);
    
    if (latestPosts.length === 0) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-info-circle text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-500 text-sm">No visibility opportunities available yet</p>
        </div>
      `;
      return;
    }
    
    partnerCallsContainer.innerHTML = latestPosts.map(post => {
      const formattedDate = formatDate(post.created_at);
      const icon = getPostTypeIcon(post.category);
      const title = escapeHtml(post.title || 'Visibility Opportunity');
      const content = escapeHtml(post.content || '');
      
      return `
        <a href="/Partner-Calls.html" class="block">
          <div class="border border-gray-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
            <div class="flex items-start gap-3">
              <div class="bg-purple-100 rounded-xl p-2 flex-shrink-0">
                <i class="bx ${icon} text-purple-600 text-xl"></i>
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-900 text-sm mb-1 truncate">${title}</p>
                <p class="text-xs text-gray-500 mb-1">${formattedDate} • ${post.category || 'General'}</p>
                <p class="text-xs text-gray-600 line-clamp-2">${content}</p>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading partner calls:', error);
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (partnerCallsContainer) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-error-circle text-4xl text-red-400 mb-2"></i>
          <p class="text-gray-500 text-sm">Unable to load visibility opportunities</p>
          <button onclick="loadPartnerCalls()" class="mt-2 text-purple-600 text-xs font-medium hover:text-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// ============================================
// DAILY REMINDER
// ============================================

function showDailyReminder(motivationalMessage, taskName) {
  const popup = document.getElementById('dailyReminderPopup');
  const messageEl = document.getElementById('dailyReminderMessage');
  const taskEl = document.getElementById('dailyReminderTaskName');
  
  if (!popup) return;

  // Safety filter
  if (typeof motivationalMessage === 'string' && motivationalMessage.includes('Remember why you started')) {
    motivationalMessage = '💪 Keep pushing forward!';
  }
  
  // Set the content
  if (messageEl) messageEl.textContent = motivationalMessage;
  if (taskEl) taskEl.textContent = taskName;
  
  // Show the popup
  popup.classList.remove('hidden');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  console.log('✅ Daily reminder shown');
}

function closeDailyReminder() {
  const popup = document.getElementById('dailyReminderPopup');
  if (!popup) return;
  
  popup.classList.remove('active');
  popup.classList.add('hidden');
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
  
  // Store that reminder was seen
  const today = new Date().toDateString();
  localStorage.setItem('dailyReminderSeen', today);
  localStorage.setItem('dailyReminderLastShown', Date.now().toString());
}

async function checkDailyReminder() {
  try {
    // Rate limiting - only show every 2 hours
    const lastReminderTime = localStorage.getItem('dailyReminderLastShown');
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    
    if (lastReminderTime && (now - parseInt(lastReminderTime)) < twoHoursInMs) {
      console.log('⏰ Daily reminder skipped - shown recently');
      return;
    }
    
    const response = await fetch('/api/journey/daily-reminder', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.hasReminder) {
        setTimeout(() => {
          showDailyReminder(data.motivationalMessage, data.taskName);
          localStorage.setItem('dailyReminderLastShown', now.toString());
        }, 1500);
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to check daily reminder:', error);
  }
}

// ============================================
// INITIALIZATION
// ============================================

async function initializeDashboard() {
  try {
    console.log('🚀 Initializing dashboard (clean version)...');
    
    // Wait a moment for ambassador-dashboard-stats-fix.js to load the stats
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Load video based on the stats that were just loaded
    await loadCurrentMonthVideo();
    
    // Load partner calls
    loadPartnerCalls();
    
    // Check daily reminder
    checkDailyReminder();
    
    console.log('✅ Dashboard initialized');
    
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Fetch user data
  fetch('/api/me', { 
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache'
    }
  })
    .then(response => {
      if (!response.ok) return null;
      return response.json();
    })
    .then(data => {
      if (!data) return;

      const welcomeHeading = document.getElementById('welcomeHeading');
      if (welcomeHeading && data.name) {
        welcomeHeading.textContent = `Welcome, ${data.name}!`;
      }
      
      const avatarElement = document.getElementById('userAvatar');
      if (avatarElement && data.name) {
        const initials = data.name.split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        avatarElement.textContent = initials;
      }
    })
    .catch(error => {
      console.warn('Could not load user data:', error);
    });

  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '/signin')
        .catch(() => window.location.href = '/signin');
    });
  }

  // Close reminder when clicking outside
  const popup = document.getElementById('dailyReminderPopup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closeDailyReminder();
      }
    });
  }

  // Initialize dashboard
  initializeDashboard();
});

// Expose functions globally
window.loadCurrentMonthVideo = loadCurrentMonthVideo;
window.loadPartnerCalls = loadPartnerCalls;
window.closeDailyReminder = closeDailyReminder;

console.log('✅ Ambassador dashboard loaded (clean version)');

*** End of File

// Video configuration
const VIDEO_CONFIG = [
  { month: 1, title: "FOUNDATION", url: "https://www.canva.com/design/DAG6j1dS_Uk/Dnd2b9mJCCwSROZIWTDVXA/watch?embed", description: "Foundation Set: Onboarding complete, first course done", duration: "5:30 mins" },
  { month: 2, title: "OPTIMIZE", url: "https://www.canva.com/design/DAGymyxxfQs/vtkXrZ8joa0giowAh60-zg/watch?embed", description: "Optimized Presence: Profile updated, first article submitted", duration: "6:15 mins" },
  { month: 3, title: "ENGAGE", url: "https://www.canva.com/design/DAGym0x892o/YmDTuaFm1nNjSaJYa93ePA/watch?embed", description: "Engaged Member: Building relationships, consistent content", duration: "5:45 mins" },
  { month: 4, title: "LEAD", url: "https://www.canva.com/design/DAGymzmB9zo/Oz_eCZ8_EDoXnTeseB6R-A/watch?embed", description: "Leadership Activated: Growing visibility, all courses complete", duration: "7:00 mins" },
  { month: 5, title: "AMPLIFY", url: "https://www.canva.com/design/DAGym1aI8Gw/Sf85oXevN7qOm5zvehr9dQ/watch?embed", description: "Amplified Impact: Leading initiatives, consistent support", duration: "6:30 mins" },
  { month: 6, title: "MIDPOINT", url: "https://www.canva.com/design/DAGym9YIUZk/OIRe6vWYWkaZjWLuMomzrg/watch?embed", description: "Halfway Strong: Story shared, momentum building", duration: "8:00 mins" },
  { month: 7, title: "VISIBILITY", url: "https://www.canva.com/design/DAGym2_NkFI/NLk8fNcIBNm7mX3lT5mJGQ/watch?embed", description: "Visible Leader: Podcast prep, strong content cadence", duration: "6:45 mins" },
  { month: 8, title: "EXPAND", url: "https://www.canva.com/design/DAGzJ0qBXKM/JeRKp6jCYA88iE3RJBUvGA/watch?embed", description: "Expanded Reach: Podcast recorded, portfolio growing", duration: "7:15 mins" },
  { month: 9, title: "CONNECT", url: "https://www.canva.com/design/DAGynDXe7nM/XwF5fSUo3GJfpJBR4sO4Vg/watch?embed", description: "Connected Leader: Deep relationships, podcast live", duration: "6:00 mins" },
  { month: 10, title: "ACCELERATE", url: "https://www.canva.com/design/DAGynMCn0XU/-9LPKLzn5Zc6W5bJS8ktXQ/watch?embed", description: "Accelerating: Final articles, opportunities in pipeline", duration: "7:30 mins" },
  { month: 11, title: "CELEBRATE", url: "https://www.canva.com/design/DAGynKgil_I/FVdnkZFWNsKo1iBsbX7omg/watch?embed", description: "Celebrating: Year documented, impact quantified", duration: "8:15 mins" },
  { month: 12, title: "RENEW", url: "https://www.canva.com/design/DAGynMcNxQI/INWdK-bvAm30aMLK45OMfw/watch?embed", description: "Transformation Complete: Full year tracked, portfolio built", duration: "9:00 mins" }
];

// Month data with milestones (single source of truth)
const MONTH_DATA = [
  { month: 1, title: "FOUNDATION", milestone: "Foundation Set: Onboarding complete, first course done, profile submitted, connections made", tasks: ['linkedin_course', 'submit_profile', 'second_course', 'connect_10', 'post_3x'] },
  { month: 2, title: "OPTIMIZE", milestone: "Optimized Presence: Profile updated, first article submitted, active in community", tasks: ['implement_audit', 'third_course', 'submit_article_1', 'engage_15'] },
  { month: 3, title: "ENGAGE", milestone: "Engaged Member: Attended event, building relationships, consistent content, impact tracked", tasks: ['first_event', 'transformation_post', 'submit_article_2', 'update_impact_log'] },
  { month: 4, title: "LEAD", milestone: "Leadership Activated: Volunteered for opportunity, all courses complete, growing visibility", tasks: ['volunteer', 'complete_courses', 'request_recommendation', 'post_4x'] },
  { month: 5, title: "AMPLIFY", milestone: "Amplified Impact: Led something, article progress, consistent support", tasks: ['lead_something', 'check_article', 'daily_engage', 'update_impact_5'] },
  { month: 6, title: "MIDPOINT", milestone: "Halfway Strong: Story shared, podcast scheduled, 50+ people impacted, momentum building", tasks: ['quarterly_event_2', 'schedule_podcast', 'halfway_story'] },
  { month: 7, title: "VISIBILITY", milestone: "Visible Leader: Podcast prep underway, leading regularly, strong content cadence", tasks: ['submit_article_next', 'lead_second', 'post_4x_m7'] },
  { month: 8, title: "EXPAND", milestone: "Expanded Reach: Podcast recorded/scheduled, applied for external opportunities, portfolio growing", tasks: ['check_partners', 'update_speaker', 'speaking_pitch', 'update_impact_8'] },
  { month: 9, title: "CONNECT", milestone: "Connected Leader: Deep relationships built, podcast live, third leadership opportunity completed", tasks: ['quarterly_event_3', 'follow_up_5'] },
  { month: 10, title: "ACCELERATE", milestone: "Accelerating: Final articles submitted, 85+ impacted, speaking opportunities in pipeline", tasks: ['submit_final', 'update_impact_10', 'apply_speaking'] },
  { month: 11, title: "CELEBRATE", milestone: "Celebrating: Year documented, story shared, impact quantified", tasks: ['quarterly_event_4', 'final_impact', 'transformation_story'] },
  { month: 12, title: "RENEW", milestone: "Transformation Complete: Full year tracked, portfolio built, thought leadership established, decision made", tasks: ['decide_renewal', 'schedule_call'] }
];

// Helper functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPostTypeIcon(postType) {
  const icons = {
    'speaking': 'bx-microphone',
    'podcast': 'bx-podcast',
    'webinar': 'bx-video',
    'volunteering': 'bx-heart',
    'general': 'bx-briefcase'
  };
  return icons[postType?.toLowerCase()] || 'bx-briefcase';
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return 'Recently';
  }
}

function validateAndFixVideoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('canva.com')) return url;
  if (url.includes('/design/')) {
    url = url.replace('/view?', '/watch?');
    if (!url.includes('/watch')) {
      url = url.replace('/design/', '/design/').replace('?embed', '/watch?embed');
    }
  }
  return url;
}

// Global variable to store journey data (single source of truth)
let CURRENT_JOURNEY_DATA = null;

/**
 * Build a simple `{ "month-taskIdentifier": true }` map from
 * the taskCompletions array returned by `/api/journey/progress`.
 *
 * This lets the dashboard cards use **database truth** (what the
 * ambassador has actually completed) while still relying on
 * `MONTH_DATA` for the canonical list of tasks per month.
 */
function buildCompletedTasksMapFromApi(apiData) {
  const completions = Array.isArray(apiData?.taskCompletions)
    ? apiData.taskCompletions
    : [];

  const completedTasks = {};

  completions.forEach((tc) => {
    const jt = tc?.journey_tasks;
    const identifier = jt?.task_identifier;
    if (!identifier) return;

    // Find the month for this task from MONTH_DATA
    const monthFromConfig = MONTH_DATA.find((m) =>
      Array.isArray(m.tasks) && m.tasks.includes(identifier)
    )?.month;

    // Fallback to API currentMonth if we can't resolve from config
    const monthNum = monthFromConfig || apiData.currentMonth || 1;
    const key = `${monthNum}-${identifier}`;
    completedTasks[key] = true;
  });

  return completedTasks;
}

// ✅ Fetch journey data ONCE and store it
async function fetchJourneyData() {
  try {
    console.log('🔄 Fetching journey data from API (/api/journey/progress)...');
    const response = await fetch('/api/journey/progress', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to load journey data');
    }
    
    const apiData = await response.json();
    
    if (!response.ok || apiData.success === false) {
      throw new Error(apiData.error || 'Failed to load journey data');
    }

    const completedTasks = buildCompletedTasksMapFromApi(apiData);
    
    CURRENT_JOURNEY_DATA = {
      currentMonth: apiData.currentMonth || 1,
      completedTasks,
      startDate: apiData.currentProgress?.started_at || new Date().toISOString()
    };
    console.log('✅ Journey data loaded:', {
      currentMonth: CURRENT_JOURNEY_DATA.currentMonth,
      completedTaskCount: Object.keys(CURRENT_JOURNEY_DATA.completedTasks || {}).length
    });
    
    return CURRENT_JOURNEY_DATA;
  } catch (error) {
    console.error('❌ Error fetching journey data:', error);
    // Fallback to month 1 if API fails
    CURRENT_JOURNEY_DATA = {
      currentMonth: 1,
      completedTasks: {},
      startDate: new Date().toISOString()
    };
    return CURRENT_JOURNEY_DATA;
  }
}

// Video functions
function showVideoError(message = null) {
  const videoContainer = document.getElementById('videoContainer');
  const currentVideo = window.currentVideo;
  
  if (videoContainer) {
    const errorMessage = message || 'Unable to load video. Please try again or open the video directly in Canva.';
    videoContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl min-h-[16rem]">
        <i class="bx bx-error-circle text-5xl text-red-500 mb-4"></i>
        <p class="text-gray-700 font-medium mb-2">Video Loading Error</p>
        <p class="text-gray-500 text-sm text-center mb-4 max-w-md">${errorMessage}</p>
        <div class="flex flex-col sm:flex-row gap-3 mt-4">
          <button onclick="loadCurrentMonthVideo()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
            <i class="bx bx-refresh mr-2"></i> Retry
          </button>
          ${currentVideo && currentVideo.url ? `
            <a href="${currentVideo.url.replace(/\/watch\?embed/, '/view').replace(/\/watch\?/, '/view?')}" target="_blank" 
               class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
              <i class="bx bx-link-external mr-2"></i> Open in Canva
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }
}

function playVideo() {
  try {
    const videoContainer = document.getElementById('videoContainer');
    const currentVideo = window.currentVideo;
    
    if (!videoContainer || !currentVideo?.url) {
      showVideoError('Video data is missing. Please refresh the page.');
      return;
    }
    
    videoContainer.innerHTML = `
      <div class="skeleton w-full min-h-[16rem] rounded-2xl"></div>
    `;
    
    let playUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!playUrl) {
      throw new Error('Invalid video URL');
    }
    
    if (playUrl.includes('canva.com')) {
      const urlParts = playUrl.split('?');
      const baseUrl = urlParts[0];
      const params = new URLSearchParams(urlParts[1] || '');
      if (!params.has('embed')) params.append('embed', '');
      params.set('autoplay', '1');
      params.delete('muted');
      playUrl = baseUrl + '?' + params.toString();
    } else {
      playUrl = playUrl.includes('?') ? playUrl + '&autoplay=1' : playUrl + '?autoplay=1';
    }
    
    setTimeout(() => {
      videoContainer.innerHTML = `
        <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #000;">
          <iframe 
            id="canvaVideoFrame"
            class="absolute top-0 left-0 w-full h-full border-0"
            src="${playUrl}"
            allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
            allowfullscreen
            frameborder="0"
            title="Month ${currentVideo.month}: ${currentVideo.title}"
            loading="eager"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
          </iframe>
        </div>
      `;
    }, 100);
  } catch (error) {
    console.error('Error in playVideo:', error);
    showVideoError(`Error loading video: ${error.message}`);
  }
}

async function loadCurrentMonthVideo() {
  try {
    console.log('🎥 ========== VIDEO LOADING START ==========');
    
    // ✅ STEP 1: Get FRESH journey data from API (NOT localStorage)
    console.log('📡 Fetching fresh journey data from /api/journey/progress...');
    const response = await fetch('/api/journey/progress', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const journeyData = await response.json();
    const currentMonth = journeyData.currentMonth || 1;
    
    console.log('✅ API Response:', {
      currentMonth: currentMonth,
      totalCompletedTasks: Object.keys(journeyData.completedTasks || {}).length
    });
    
    // ✅ STEP 2: Find the correct video for this month
    console.log(`🔍 Looking for video for Month ${currentMonth}...`);
    const currentVideo = VIDEO_CONFIG.find(v => v.month === currentMonth);
    
    if (!currentVideo) {
      console.error(`❌ No video found for Month ${currentMonth}`);
      console.log('Available months:', VIDEO_CONFIG.map(v => v.month));
      showVideoError(`Video not found for Month ${currentMonth}`);
      return;
    }
    
    console.log('✅ Found video:', {
      month: currentVideo.month,
      title: currentVideo.title
    });
    
    // ✅ STEP 3: Validate URL
    const validatedUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!validatedUrl) {
      throw new Error('Invalid video URL');
    }
    
    // ✅ STEP 4: Store globally
    window.currentVideo = { ...currentVideo, url: validatedUrl };
    
    // ✅ STEP 5: Update ALL text elements IMMEDIATELY
    console.log('📝 Updating UI elements...');
    
    // Video title
    const videoTitle = document.getElementById('videoTitle');
    if (videoTitle) {
      videoTitle.textContent = `Month ${currentMonth}: ${currentVideo.title}`;
      console.log('✓ videoTitle updated');
    }
    
    // Video description
    const videoDescription = document.getElementById('videoDescription');
    if (videoDescription) {
      videoDescription.textContent = currentVideo.description;
      console.log('✓ videoDescription updated');
    }
    
    // Video meta
    const videoMeta = document.getElementById('videoMeta');
    if (videoMeta) {
      videoMeta.textContent = `${currentVideo.duration} • Month ${currentMonth}`;
      console.log('✓ videoMeta updated');
    }
    
    // ✅ STEP 6: Build and load iframe
    console.log('🎬 Loading video iframe...');
    const videoContainer = document.getElementById('videoContainer');
    
    if (!videoContainer) {
      console.error('❌ videoContainer element not found!');
      return;
    }
    
    // Build embed URL with autoplay
    let embedUrl = validatedUrl;
    if (embedUrl.includes('canva.com')) {
      const urlParts = embedUrl.split('?');
      const baseUrl = urlParts[0];
      const params = new URLSearchParams(urlParts[1] || '');
      if (!params.has('embed')) params.append('embed', '');
      params.set('autoplay', '1');
      params.delete('muted');
      embedUrl = baseUrl + '?' + params.toString();
    }
    
    // Insert video iframe
    videoContainer.innerHTML = `
      <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #000;">
        <iframe 
          id="canvaVideoFrame"
          class="absolute top-0 left-0 w-full h-full border-0"
          src="${embedUrl}"
          allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
          allowfullscreen
          frameborder="0"
          title="Month ${currentMonth}: ${currentVideo.title}"
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
        </iframe>
      </div>
    `;
    
    console.log('✅ Video iframe inserted successfully');
    
    // ✅ STEP 7: Final verification
    const finalTitle = document.getElementById('videoTitle')?.textContent;
    const expectedTitle = `Month ${currentMonth}: ${currentVideo.title}`;
    
    if (finalTitle === expectedTitle) {
      console.log('✅✅✅ SUCCESS! Video matches journey month:', currentMonth);
    } else {
      console.error('❌ Mismatch detected!');
      console.error('Expected:', expectedTitle);
      console.error('Got:', finalTitle);
    }
    
    console.log('========== VIDEO LOADING COMPLETE ==========\n');
    
  } catch (error) {
    console.error('❌ ========== VIDEO LOADING FAILED ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    showVideoError(error.message || 'Failed to load video');
  }
}

async function loadPartnerCalls() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (!partnerCallsContainer) return;
    
    const posts = data.posts || [];
    const latestPosts = posts.slice(0, 2);
    
    if (latestPosts.length === 0) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-info-circle text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-500 text-sm">No visibility opportunities available yet</p>
        </div>
      `;
      return;
    }
    
    partnerCallsContainer.innerHTML = latestPosts.map(post => {
      const formattedDate = formatDate(post.created_at);
      const icon = getPostTypeIcon(post.category);
      const title = escapeHtml(post.title || 'Visibility Opportunity');
      const content = escapeHtml(post.content || '');
      
      return `
        <a href="/Partner-Calls.html" class="block">
          <div class="border border-gray-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
            <div class="flex items-start gap-3">
              <div class="bg-purple-100 rounded-xl p-2 flex-shrink-0">
                <i class="bx ${icon} text-purple-600 text-xl"></i>
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-900 text-sm mb-1 truncate">${title}</p>
                <p class="text-xs text-gray-500 mb-1">${formattedDate} • ${post.category || 'General'}</p>
                <p class="text-xs text-gray-600 line-clamp-2">${content}</p>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading partner calls:', error);
    const partnerCallsContainer = document.getElementById('partnerCallsContainer');
    if (partnerCallsContainer) {
      partnerCallsContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="bx bx-error-circle text-4xl text-red-400 mb-2"></i>
          <p class="text-gray-500 text-sm">Unable to load visibility opportunities</p>
          <button onclick="loadPartnerCalls()" class="mt-2 text-purple-600 text-xs font-medium hover:text-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Optimized dashboard stats loading with batching - Now uses API as single source of truth
async function loadDashboardStats() {
  try {
    // Use already-loaded journey data or fetch it
    const journeyData = CURRENT_JOURNEY_DATA || await fetchJourneyData();
    const currentMonth = journeyData.currentMonth || 1;
    const completedTasks = journeyData.completedTasks || {};
    
    console.log('✅ Dashboard using Month', currentMonth, 'from journey data');
    
    // Calculate overall progress
    const overallProgress = MONTH_DATA.length > 0 ? MONTH_DATA.reduce((acc, m) => {
      const monthCompleted = Object.keys(completedTasks).filter(key => {
        const [monthNum] = key.split('-');
        return parseInt(monthNum) === m.month && completedTasks[key];
      }).length;
      return acc + (monthCompleted / m.tasks.length);
    }, 0) / MONTH_DATA.length * 100 : 0;
    
    const roundedProgress = Math.round(overallProgress);
    
    const currentMonthData = MONTH_DATA.find(m => m.month === currentMonth);
    let currentMonthCompleted = 0;
    if (currentMonthData) {
      currentMonthCompleted = Object.keys(completedTasks).filter(key => {
        const [monthNum] = key.split('-');
        return parseInt(monthNum) === currentMonth && completedTasks[key];
      }).length;
    }
    const currentMonthTotal = currentMonthData ? currentMonthData.tasks.length : 0;
    const upcomingTasks = currentMonthTotal - currentMonthCompleted;
    
    // Update UI
    const journeyProgress = document.getElementById('journeyProgress');
    const journeyMonth = document.getElementById('journeyMonth');
    if (journeyProgress) journeyProgress.textContent = `${roundedProgress}%`;
    if (journeyMonth) journeyMonth.textContent = `Month ${currentMonth} of 12`;
    
    const completedTasksCount = document.getElementById('completedTasksCount');
    const upcomingTasksCount = document.getElementById('upcomingTasksCount');
    if (completedTasksCount) completedTasksCount.textContent = currentMonthCompleted;
    if (upcomingTasksCount) upcomingTasksCount.textContent = `${upcomingTasks} remaining`;
    
    const nextMilestoneText = document.getElementById('nextMilestoneText');
    if (nextMilestoneText) {
      if (currentMonth < 12) {
        const nextMonthData = MONTH_DATA.find(m => m.month === currentMonth + 1);
        if (nextMonthData) {
          nextMilestoneText.textContent = `Month ${nextMonthData.month}: ${nextMonthData.title}`;
        }
      } else {
        nextMilestoneText.textContent = "🎉 Journey Complete! Time to Renew";
      }
    }
    
    const daysInProgramText = document.getElementById('daysInProgramText');
    if (daysInProgramText) {
      daysInProgramText.textContent = `Month ${currentMonth} of 12`;
    }
    
    // Batch API calls
    const [articlesRes, applicationsRes] = await Promise.allSettled([
      fetch('/api/ambassador/articles?limit=100', { credentials: 'include' }),
      fetch('/api/ambassador/applications', { credentials: 'include' })
    ]);
    
    // Process articles
    if (articlesRes.status === 'fulfilled' && articlesRes.value.ok) {
      const articlesData = await articlesRes.value.json();
      const articles = articlesData.items || [];
      const pendingArticles = articles.filter(a => 
        a.status === 'pending' || a.status === 'needs_update' || a.status === 'draft'
      );
      const publishedArticles = articles.filter(a => a.status === 'published');
      
      const articlesPendingCount = document.getElementById('articlesPendingCount');
      const nextArticleDue = document.getElementById('nextArticleDue');
      
      if (articlesPendingCount) articlesPendingCount.textContent = pendingArticles.length;
      if (nextArticleDue) {
        if (publishedArticles.length > 0) {
          nextArticleDue.textContent = `${publishedArticles.length} published`;
        } else if (articles.length > 0) {
          nextArticleDue.textContent = `${articles.length} total`;
        } else {
          nextArticleDue.textContent = 'Write your first!';
        }
      }
    }
    
    // Process applications
    if (applicationsRes.status === 'fulfilled' && applicationsRes.value.ok) {
      const applicationsData = await applicationsRes.value.json();
      const applications = applicationsData.items || [];
      const pendingApps = applications.filter(a => a.status === 'pending');
      const acceptedApps = applications.filter(a => a.status === 'accepted' || a.status === 'approved');
      
      const applicationsCount = document.getElementById('applicationsCount');
      const applicationsStatus = document.getElementById('applicationsStatus');
      
      if (applicationsCount) applicationsCount.textContent = applications.length;
      if (applicationsStatus) {
        if (pendingApps.length > 0) {
          applicationsStatus.textContent = `${pendingApps.length} pending review`;
        } else if (acceptedApps.length > 0) {
          applicationsStatus.textContent = `${acceptedApps.length} accepted`;
        } else if (applications.length > 0) {
          applicationsStatus.textContent = `${applications.length} submitted`;
        } else {
          applicationsStatus.textContent = 'Apply to opportunities';
        }
      }
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

// ✅ Initialize dashboard with synchronized data
async function initializeDashboard() {
  try {
    console.log('🚀 ========== DASHBOARD INITIALIZATION START ==========');
    
    // ✅ STEP 0: Show loading states immediately
    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    const videoMeta = document.getElementById('videoMeta');
    const journeyProgress = document.getElementById('journeyProgress');
    const journeyMonth = document.getElementById('journeyMonth');
    
    const skeletonBar = (w) => `<div class="skeleton h-5 ${w} mx-auto"></div>`;
    if (videoTitle) videoTitle.innerHTML = skeletonBar('w-24');
    if (videoDescription) videoDescription.innerHTML = skeletonBar('w-48');
    if (videoMeta) videoMeta.textContent = 'Please wait...';
    if (journeyProgress) journeyProgress.innerHTML = skeletonBar('w-12');
    if (journeyMonth) journeyMonth.innerHTML = skeletonBar('w-16');
    
    // ✅ STEP 1: Fetch journey data FIRST
    console.log('📡 Step 1: Fetching journey data from /api/journey/progress...');
    const journeyResponse = await fetch('/api/journey/progress', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!journeyResponse.ok) {
      throw new Error('Failed to fetch journey data');
    }
    
    const journeyApiData = await journeyResponse.json();
    
    if (!journeyResponse.ok || journeyApiData.success === false) {
      throw new Error(journeyApiData.error || 'Failed to fetch journey data');
    }
    
    const journeyData = {
      currentMonth: journeyApiData.currentMonth || 1,
      completedTasks: buildCompletedTasksMapFromApi(journeyApiData),
      startDate: journeyApiData.currentProgress?.started_at || new Date().toISOString()
    };
    console.log('✅ Journey data received:', {
      currentMonth: journeyData.currentMonth,
      completedTasks: Object.keys(journeyData.completedTasks || {}).length
    });
    
    // ✅ Store globally for other functions to use
    window.CURRENT_JOURNEY_DATA = journeyData;
    CURRENT_JOURNEY_DATA = journeyData;
    
    // ✅ STEP 2: Load video using the journey data
    console.log('🎥 Step 2: Loading video for Month', journeyData.currentMonth);
    await loadCurrentMonthVideo();
    
    // ✅ STEP 3: Load dashboard stats
    console.log('📊 Step 3: Loading dashboard stats...');
    await loadDashboardStats();
    
    // ✅ STEP 3.5: Check and show daily reminder (with rate limiting)
    try {
      // Check if reminder was shown recently (within last 2 hours)
      const lastReminderTime = localStorage.getItem('dailyReminderLastShown');
      const now = Date.now();
      const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      
      if (lastReminderTime && (now - parseInt(lastReminderTime)) < twoHoursInMs) {
        console.log('⏰ Daily reminder skipped - shown recently');
        return; // Skip showing reminder if it was shown within last 2 hours
      }
      
      const reminderResponse = await fetch('/api/journey/daily-reminder', {
        credentials: 'include'
      });
      if (reminderResponse.ok) {
        const reminderData = await reminderResponse.json();
        if (reminderData.hasReminder) {
          // Show the reminder popup after a short delay
          setTimeout(() => {
            showDailyReminder(reminderData.motivationalMessage, reminderData.taskName);
            // Store the time when reminder was shown
            localStorage.setItem('dailyReminderLastShown', now.toString());
          }, 1500);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to check daily reminder:', error);
    }
    
    // ✅ STEP 4: Load partner calls
    console.log('💼 Step 4: Loading partner calls...');
    loadPartnerCalls();
    
    console.log('✅✅✅ DASHBOARD INITIALIZATION COMPLETE ✅✅✅\n');
    
  } catch (error) {
    console.error('❌ ========== DASHBOARD INITIALIZATION FAILED ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    // Show a friendly video error but still try to load basic stats
    showVideoError('Failed to initialize dashboard');
    try {
      // Fallback: load stats from local journey data (localStorage) so
      // the top cards don’t stay stuck on "Loading..."
      await loadDashboardStats();
    } catch (statsError) {
      console.error('❌ Failed to load fallback dashboard stats:', statsError);
    }
  }
}

// Daily Reminder Functions
function showDailyReminder(motivationalMessage, taskName) {
  const popup = document.getElementById('dailyReminderPopup');
  const messageEl = document.getElementById('dailyReminderMessage');
  const taskEl = document.getElementById('dailyReminderTaskName');
  
  if (!popup) return;

  // Safety filter: remove deprecated message text if it ever appears
  if (typeof motivationalMessage === 'string' && motivationalMessage.includes('Remember why you started')) {
    motivationalMessage = '💪 Keep pushing forward!';
  }
  
  // Set the content
  if (messageEl) messageEl.textContent = motivationalMessage;
  if (taskEl) taskEl.textContent = taskName;
  
  // Show the popup
  popup.classList.remove('hidden');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  console.log('✅ Daily reminder shown:', { motivationalMessage, taskName });
}

function closeDailyReminder() {
  const popup = document.getElementById('dailyReminderPopup');
  if (!popup) return;
  
  popup.classList.remove('active');
  popup.classList.add('hidden');
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
  
  // Store that reminder was seen today
  const today = new Date().toDateString();
  localStorage.setItem('dailyReminderSeen', today);
  // Also update the last shown timestamp
  localStorage.setItem('dailyReminderLastShown', Date.now().toString());
}

// Close reminder when clicking outside
document.addEventListener('DOMContentLoaded', function() {
  const popup = document.getElementById('dailyReminderPopup');
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closeDailyReminder();
      }
    });
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Fetch user data - NO REDIRECTS on page load, just update UI if available
  fetch('/api/me', { 
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache'
    }
  })
    .then(response => {
      // NO REDIRECTS - just try to get user data if available
      if (!response.ok) {
        // Silently fail - don't redirect, don't throw
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (!data) {
        // No user data - that's okay, just continue
        return;
      }

      const welcomeHeading = document.getElementById('welcomeHeading');
      if (welcomeHeading && data.name) {
        try {
          // Use a per-user key so we only treat the very first login as "Welcome"
          const storageKey = data.id
            ? `hasLoggedInBefore_${data.id}`
            : 'hasLoggedInBefore_default';

          const hasLoggedInBefore =
            typeof window !== 'undefined' &&
            window.localStorage &&
            window.localStorage.getItem(storageKey) === 'true';

          if (hasLoggedInBefore) {
            welcomeHeading.textContent = `Welcome, ${data.name}!`;
          } else {
            welcomeHeading.textContent = `Welcome, ${data.name}!`;
            // Mark that this user has now logged in at least once
            window.localStorage.setItem(storageKey, 'true');
          }
        } catch (e) {
          // Fallback if localStorage is unavailable
          welcomeHeading.textContent = `Welcome, ${data.name}!`;
        }
      }
      
      const avatarElement = document.getElementById('userAvatar');
      if (avatarElement && data.name) {
        const initials = data.name.split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        avatarElement.textContent = initials;
      }
    })
    .catch(error => {
      // Silently ignore all errors - NO REDIRECTS on page load
      // User can navigate freely, auth will be checked when needed
    });

  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '/signin')
        .catch(() => window.location.href = '/signin');
    });
  }

  // ✅ CRITICAL: Initialize dashboard with synchronized data
  initializeDashboard();
  
  // ❌ REMOVED: Polling interval that was causing video to reset
  // If you need to refresh data, use the forceRefreshVideo() function instead
});

// ============================================
// Additional Helper: Force Refresh Function
// ============================================

// Add this function to manually refresh if needed
async function forceRefreshVideo() {
  console.log('🔄 Manual video refresh triggered...');
  
  try {
    // Clear any cached data
    if (window.CURRENT_JOURNEY_DATA) {
      delete window.CURRENT_JOURNEY_DATA;
    }
    if (CURRENT_JOURNEY_DATA) {
      CURRENT_JOURNEY_DATA = null;
    }
    
    // Reload video
    await loadCurrentMonthVideo();
    
    console.log('✅ Manual refresh complete!');
  } catch (error) {
    console.error('❌ Manual refresh failed:', error);
  }
}

// Expose functions globally for onclick handlers
window.loadCurrentMonthVideo = loadCurrentMonthVideo;
window.loadPartnerCalls = loadPartnerCalls;
window.forceRefreshVideo = forceRefreshVideo;

console.log('✅ Fixed dashboard script loaded with synchronized video loading');
console.log('💡 If video is wrong, open console and run: forceRefreshVideo()');

// ============================================
// DIAGNOSTIC SCRIPT - Debug journey month mismatch
// This will help us see what's actually happening
// ============================================

async function debugJourneyMonth() {
  console.log('🔍 ========== JOURNEY MONTH DEBUG ==========');
  
  try {
    // 1. Check what's in localStorage
    const localStorageTasks = localStorage.getItem('journey_tasks_default');
    const localStorageMonth = localStorage.getItem('journey_current_month_default');
    
    console.log('📦 LocalStorage Data:');
    console.log('  - Tasks:', localStorageTasks ? 'EXISTS' : 'NONE');
    console.log('  - Month:', localStorageMonth || 'NONE');
    
    if (localStorageTasks) {
      const tasks = JSON.parse(localStorageTasks);
      console.log('  - Task Count:', Object.keys(tasks).length);
      console.log('  - Sample tasks:', Object.keys(tasks).slice(0, 5));
    }
    
    // 2. Check what the API returns
    console.log('\n🌐 API Data:');
    const response = await fetch('/api/journey/progress', {
      credentials: 'include'
    });
    const journeyApiData = await response.json();
    
    console.log('  - Status:', response.ok && journeyApiData.success !== false ? '✅ OK' : '❌ FAILED');
    console.log('  - Current Month:', journeyApiData.currentMonth);
    console.log('  - TaskCompletions:', (journeyApiData.taskCompletions || []).length);
    console.log('  - Progress Records:', (journeyApiData.allProgress || []).length);
    
    // 3. Check current video
    console.log('\n🎥 Video State:');
    console.log('  - window.currentVideo:', window.currentVideo?.month || 'NOT SET');
    console.log('  - Video title:', window.currentVideo?.title || 'NOT SET');
    
    // 4. Check VIDEO_CONFIG
    console.log('\n📋 Video Config:');
    console.log('  - Total videos:', VIDEO_CONFIG.length);
    console.log('  - Month 1 exists:', !!VIDEO_CONFIG.find(v => v.month === 1));
    console.log('  - Month 3 exists:', !!VIDEO_CONFIG.find(v => v.month === 3));
    
    // 5. CRITICAL CHECK: What video SHOULD be playing?
    const expectedVideo = VIDEO_CONFIG.find(v => v.month === (journeyApiData.currentMonth || 1));
    console.log('\n✅ EXPECTED VIDEO:');
    console.log('  - Month:', journeyApiData.currentMonth || 1);
    console.log('  - Title:', expectedVideo?.title || 'NOT FOUND');
    console.log('  - URL exists:', !!expectedVideo?.url);
    
    // 6. What video IS playing?
    const videoTitle = document.getElementById('videoTitle')?.textContent;
    console.log('\n🎬 ACTUAL VIDEO ON PAGE:');
    console.log('  - Title element shows:', videoTitle);
    
    // 7. Final comparison
    console.log('\n🔍 COMPARISON:');
    console.log('  - API says month:', journeyApiData.currentMonth || 1);
    console.log('  - Expected video:', expectedVideo?.title);
    console.log('  - Page shows:', videoTitle);
    const apiMonth = journeyApiData.currentMonth || 1;
    console.log('  - MATCH?', videoTitle?.includes(`Month ${apiMonth}`) ? '✅ YES' : '❌ NO');
    
    console.log('\n========== DEBUG COMPLETE ==========');
    
    // Return diagnosis
    return {
      localStorage: {
        month: localStorageMonth,
        hasTasks: !!localStorageTasks
      },
      api: {
        month: journeyData.currentMonth,
        taskCount: Object.keys(journeyData.completedTasks || {}).length
      },
      video: {
        expected: expectedVideo?.title,
        actual: videoTitle
      },
      diagnosis: videoTitle?.includes(`Month ${journeyData.currentMonth}`) 
        ? '✅ Video matches journey month' 
        : '❌ Video DOES NOT match journey month'
    };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { error: error.message };
  }
}

// ============================================
// TEMPORARY FIX (while we debug)
// Force refresh video based on API data
// ============================================
async function forceVideoRefresh() {
  console.log('🔄 Force refreshing video...');
  
  try {
    // Get CURRENT month from API (new journey progress endpoint)
    const response = await fetch('/api/journey/progress', {
      credentials: 'include'
    });
    const apiData = await response.json();
    const currentMonth = apiData.currentMonth || 1;
    
    console.log('📍 API says you are in Month:', currentMonth);
    
    // Find the correct video
    const correctVideo = VIDEO_CONFIG.find(v => v.month === currentMonth);
    
    if (!correctVideo) {
      console.error('❌ No video found for month', currentMonth);
      return;
    }
    
    console.log('✅ Loading video:', correctVideo.title);
    
    // Validate and fix URL
    const validatedUrl = validateAndFixVideoUrl(correctVideo.url);
    if (!validatedUrl) {
      console.error('❌ Invalid video URL');
      return;
    }
    
    // Update global state
    window.currentVideo = { ...correctVideo, url: validatedUrl };
    
    // Update UI elements
    const videoTitle = document.getElementById('videoTitle');
    if (videoTitle) {
      videoTitle.textContent = `Month ${currentMonth}: ${correctVideo.title}`;
    }
    
    const videoDescription = document.getElementById('videoDescription');
    if (videoDescription) {
      videoDescription.textContent = correctVideo.description;
    }
    
    const videoMeta = document.getElementById('videoMeta');
    if (videoMeta) {
      videoMeta.textContent = `${correctVideo.duration} • Month ${currentMonth}`;
    }
    
    // Force reload video
    playVideo();
    
    console.log('✅ Video refresh complete!');
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error);
  }
}

// Export debug functions for console access
window.debugJourneyMonth = debugJourneyMonth;
window.forceVideoRefresh = forceVideoRefresh;

console.log('🔧 Debug tools loaded! Type debugJourneyMonth() in console to diagnose the issue.');

// ============================================
// NUCLEAR FIX - This bypasses ALL other logic
// This will force-update the video every 2 seconds based on what the dashboard says
// ============================================

// Wait for page to fully load
setTimeout(() => {
  console.log('🔥 NUCLEAR FIX ACTIVATED - Force syncing video to dashboard');
  
  function forceVideoSync() {
    try {
      // Step 1: Read what month the dashboard says
      const journeyMonthElement = document.getElementById('journeyMonth');
      
      if (!journeyMonthElement) {
        console.warn('⚠️ journeyMonth element not found');
        return;
      }
      
      const journeyMonthText = journeyMonthElement.textContent; // e.g., "Month 5 of 12"
      const match = journeyMonthText.match(/Month (\d+)/);
      
      if (!match) {
        console.warn('⚠️ Could not parse month from:', journeyMonthText);
        return;
      }
      
      const dashboardMonth = parseInt(match[1]);
      console.log('📊 Dashboard says: Month', dashboardMonth);
      
      // Step 2: Check what the video title says
      const videoTitleElement = document.getElementById('videoTitle');
      
      if (!videoTitleElement) {
        console.warn('⚠️ videoTitle element not found');
        return;
      }
      
      const videoTitleText = videoTitleElement.textContent; // e.g., "Month 1: FOUNDATION"
      const videoMatch = videoTitleText.match(/Month (\d+)/);
      
      const currentVideoMonth = videoMatch ? parseInt(videoMatch[1]) : null;
      console.log('🎥 Video currently shows: Month', currentVideoMonth);
      
      // Step 3: If they don't match, force update
      if (currentVideoMonth !== dashboardMonth) {
        console.log('❌ MISMATCH DETECTED! Dashboard says', dashboardMonth, 'but video shows', currentVideoMonth);
        console.log('🔧 FORCING VIDEO UPDATE...');
        
        // Find the correct video
        const correctVideo = VIDEO_CONFIG.find(v => v.month === dashboardMonth);
        
        if (!correctVideo) {
          console.error('❌ No video found for month', dashboardMonth);
          return;
        }
        
        console.log('✅ Found correct video:', correctVideo.title);
        
        // Update video title
        videoTitleElement.textContent = `Month ${dashboardMonth}: ${correctVideo.title}`;
        console.log('✅ Updated video title');
        
        // Update video description
        const videoDescription = document.getElementById('videoDescription');
        if (videoDescription) {
          videoDescription.textContent = correctVideo.description;
          console.log('✅ Updated video description');
        }
        
        // Update video meta
        const videoMeta = document.getElementById('videoMeta');
        if (videoMeta) {
          videoMeta.textContent = `${correctVideo.duration} • Month ${dashboardMonth}`;
          console.log('✅ Updated video meta');
        }
        
        // Update the actual video iframe
        const videoContainer = document.getElementById('videoContainer');
        if (videoContainer) {
          const validatedUrl = validateAndFixVideoUrl(correctVideo.url);
          
          if (validatedUrl) {
            let embedUrl = validatedUrl;
            if (embedUrl.includes('canva.com')) {
              const urlParts = embedUrl.split('?');
              const baseUrl = urlParts[0];
              const params = new URLSearchParams(urlParts[1] || '');
              if (!params.has('embed')) params.append('embed', '');
              params.set('autoplay', '1');
              embedUrl = baseUrl + '?' + params.toString();
            }
            
            videoContainer.innerHTML = `
              <div class="relative w-full rounded-2xl overflow-hidden shadow-2xl video-preview" style="padding-top: 56.25%; background: #000;">
                <iframe 
                  id="canvaVideoFrame"
                  class="absolute top-0 left-0 w-full h-full border-0"
                  src="${embedUrl}"
                  allow="autoplay *; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write; encrypted-media"
                  allowfullscreen
                  frameborder="0"
                  title="Month ${dashboardMonth}: ${correctVideo.title}"
                  loading="eager"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-autoplay">
                </iframe>
              </div>
            `;
            
            console.log('✅ Updated video iframe to Month', dashboardMonth);
            console.log('🎉 VIDEO SYNC COMPLETE!');
            
            // Store globally
            window.currentVideo = { ...correctVideo, url: validatedUrl };
          }
        }
        
      } else {
        console.log('✅ Video already matches dashboard (Month', dashboardMonth, ')');
      }
      
    } catch (error) {
      console.error('❌ Force sync error:', error);
    }
  }
  
  // Run once immediately
  console.log('🚀 Running initial video sync...');
  forceVideoSync();
  
  // Then run every 2 seconds to keep checking
  setInterval(() => {
    forceVideoSync();
  }, 2000);
  
  console.log('✅ Nuclear fix installed - video will auto-sync every 2 seconds');
  
}, 3000); // Wait 3 seconds after page load to ensure everything is ready
