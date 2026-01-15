// ============================================
// AMBASSADOR DASHBOARD - OPTIMIZED
// ============================================

// Video configuration
const VIDEO_CONFIG = [
  { month: 1, title: "FOUNDATION", url: "https://www.canva.com/design/DAG1M6MU20c/C1-a9vTfy3AOESPfRhyxfQ/watch?embed", description: "Foundation Set: Onboarding complete, first course done", duration: "5:30 mins" },
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
      <div class="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl min-h-[16rem]">
        <div class="animate-pulse flex flex-col items-center">
          <div class="bg-white rounded-full p-4 mb-4">
            <i class="bx bx-loader-alt text-3xl text-purple-600 animate-spin"></i>
          </div>
          <p class="text-gray-700 font-medium">Loading video...</p>
        </div>
      </div>
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
    const response = await fetch('/api/journey');
    if (!response.ok) throw new Error('Failed to load journey data');
    
    const journeyData = await response.json();
    let currentMonth = Math.max(1, Math.min(12, journeyData.currentMonth || 1));
    
    let currentVideo = VIDEO_CONFIG.find(v => v.month === currentMonth);
    if (!currentVideo) throw new Error(`Video configuration missing for month ${currentMonth}`);
    
    const validatedUrl = validateAndFixVideoUrl(currentVideo.url);
    if (!validatedUrl) throw new Error(`Invalid video URL for month ${currentMonth}`);
    
    currentVideo = { ...currentVideo, url: validatedUrl };
    window.currentVideo = currentVideo;
    
    const currentMonthInfo = MONTH_DATA.find(m => m.month === currentMonth);
    const nextMonthInfo = MONTH_DATA.find(m => m.month === currentMonth + 1);
    
    // Update UI elements
    const heroDescription = document.getElementById('heroDescription');
    if (heroDescription && currentMonthInfo) {
      heroDescription.innerHTML = `
        You're in Month ${currentMonth} <span class="font-semibold">${currentMonthInfo.title} Stage</span><br />
        ${currentMonthInfo.milestone}
      `;
    }
    
    const nextMilestoneText = document.getElementById('nextMilestoneText');
    if (nextMilestoneText) {
      nextMilestoneText.textContent = nextMonthInfo 
        ? `Month ${nextMonthInfo.month}: ${nextMonthInfo.title}`
        : currentMonth === 12 ? "🎉 Journey Complete! Time to Renew" : "Loading...";
    }
    
    const daysInProgramText = document.getElementById('daysInProgramText');
    if (daysInProgramText) {
      const tasksForMonth = journeyData.tasks || {};
      const tasksInCurrentMonth = Object.keys(tasksForMonth).filter(key => {
        const [monthNum] = key.split('-');
        return parseInt(monthNum) === currentMonth;
      }).length;
      const currentMonthTotalTasks = journeyData.monthTasks?.[currentMonth] || 5;
      const currentMonthProgress = currentMonthTotalTasks > 0 
        ? Math.round((tasksInCurrentMonth / currentMonthTotalTasks) * 100) 
        : 0;
      daysInProgramText.textContent = `${currentMonthProgress}% of month tasks completed`;
    }
    
    const videoTitle = document.getElementById('videoTitle');
    if (videoTitle) videoTitle.textContent = `Month ${currentMonth}: ${currentVideo.title}`;
    
    const videoDescription = document.getElementById('videoDescription');
    if (videoDescription) videoDescription.textContent = currentVideo.description;
    
    const videoMeta = document.getElementById('videoMeta');
    if (videoMeta) videoMeta.textContent = `${currentVideo.duration} • Month ${currentMonth}`;
    
    const videoContainer = document.getElementById('videoContainer');
    if (videoContainer) {
      setTimeout(() => playVideo(), 500);
    }
  } catch (error) {
    console.error('Error loading video:', error);
    showVideoError(error.message || 'Failed to load video data.');
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
          <p class="text-gray-500 text-sm">No partner opportunities available yet</p>
        </div>
      `;
      return;
    }
    
    partnerCallsContainer.innerHTML = latestPosts.map(post => {
      const formattedDate = formatDate(post.created_at);
      const icon = getPostTypeIcon(post.category);
      const title = escapeHtml(post.title || 'Partner Opportunity');
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
          <p class="text-gray-500 text-sm">Unable to load partner opportunities</p>
          <button onclick="loadPartnerCalls()" class="mt-2 text-purple-600 text-xs font-medium hover:text-purple-700 transition-colors">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Optimized dashboard stats loading with batching
async function loadDashboardStats() {
  try {
    const journeyStorageKey = 'journey_tasks_default';
    const savedTasks = localStorage.getItem(journeyStorageKey);
    const completedTasks = savedTasks ? JSON.parse(savedTasks) : {};
    
    // Calculate overall progress
    const overallProgress = MONTH_DATA.length > 0 ? MONTH_DATA.reduce((acc, m) => {
      const monthCompleted = Object.keys(completedTasks).filter(key => {
        const [monthNum] = key.split('-');
        return parseInt(monthNum) === m.month && completedTasks[key];
      }).length;
      return acc + (monthCompleted / m.tasks.length);
    }, 0) / MONTH_DATA.length * 100 : 0;
    
    const roundedProgress = Math.round(overallProgress);
    
    // Find current month
    let currentMonth = 1;
    Object.keys(completedTasks).forEach(key => {
      const [monthNum] = key.split('-');
      const month = parseInt(monthNum);
      if (!isNaN(month) && month > currentMonth) currentMonth = month;
    });
    
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
    
    const heroDescription = document.getElementById('heroDescription');
    if (heroDescription && currentMonthData) {
      heroDescription.innerHTML = `
        You're in Month ${currentMonth} <span class="font-semibold">${currentMonthData.title} Stage</span><br />
        ${currentMonthData.milestone}
      `;
    }
    
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('overlay');
  
  if (sidebarToggle && sidebar && overlay) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    });
    
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }

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
        welcomeHeading.textContent = `Welcome back, ${data.name}!`;
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

  // Load data
  loadCurrentMonthVideo();
  loadPartnerCalls();
  loadDashboardStats();
  
  // Optimized polling - reduced from 2s to 10s
  let lastKnownTasks = localStorage.getItem('journey_tasks_default');
  setInterval(() => {
    const currentTasks = localStorage.getItem('journey_tasks_default');
    if (currentTasks !== lastKnownTasks) {
      lastKnownTasks = currentTasks;
      loadDashboardStats();
    }
  }, 10000); // Changed from 2000ms to 10000ms
});

// Expose functions globally for onclick handlers
window.loadCurrentMonthVideo = loadCurrentMonthVideo;
window.loadPartnerCalls = loadPartnerCalls;
