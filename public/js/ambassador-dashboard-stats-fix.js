/**
 * ========================================
 * AMBASSADOR DASHBOARD - REAL-TIME STATS
 * ========================================
 * This script fixes the journey stats to fetch from database instead of localStorage
 *
 * It is designed to be additive and non-destructive:
 * - It ONLY updates the stats cards (journey progress, completed tasks, hero text)
 * - It does NOT touch existing video, reminders, or partner calls logic
 */

// ============================================
// 1. TASK CONFIG + FETCH FROM /api/journey/progress
// ============================================

// Canonical list of journey tasks by month (must match DB journey_tasks.task_identifier)
const DASHBOARD_MONTH_TASKS = {
  1: ['linkedin_course', 'submit_profile', 'second_course', 'connect_10', 'post_3x'],
  2: ['implement_audit', 'third_course', 'submit_article_1', 'engage_15'],
  3: ['first_event', 'transformation_post', 'submit_article_2', 'update_impact_log'],
  4: ['volunteer', 'complete_courses', 'request_recommendation', 'post_4x'],
  5: ['lead_something', 'check_article', 'daily_engage', 'update_impact_5'],
  6: ['quarterly_event_2', 'schedule_podcast', 'halfway_story'],
  7: ['submit_article_next', 'lead_second', 'post_4x_m7'],
  8: ['check_partners', 'update_speaker', 'speaking_pitch', 'update_impact_8'],
  9: ['quarterly_event_3', 'follow_up_5'],
  10: ['submit_final', 'update_impact_10', 'apply_speaking'],
  11: ['quarterly_event_4', 'final_impact', 'transformation_story'],
  12: ['decide_renewal', 'schedule_call'],
};

function buildStatsFromProgress(apiData) {
  const currentMonth = apiData.currentMonth || 1;

  // Build a set of completed task identifiers from ambassador_task_completion
  const completedIds = new Set();
  const completions = Array.isArray(apiData.taskCompletions)
    ? apiData.taskCompletions
    : [];

  completions.forEach((tc) => {
    const jt = tc.journey_tasks || {};
    const identifier = jt.task_identifier || tc.task_identifier;
    if (identifier) completedIds.add(identifier);
  });

  // Mirror journey.html logic:
  // overallProgress = average of per‑month completion ratios
  const monthNumbers = Object.keys(DASHBOARD_MONTH_TASKS).map((n) =>
    parseInt(n, 10)
  );

  let totalTasks = 0;
  let completedCount = 0;
  let overallAccum = 0;

  monthNumbers.forEach((m) => {
    const ids = DASHBOARD_MONTH_TASKS[m] || [];
    const monthCompleted = ids.filter((id) => completedIds.has(id)).length;

    totalTasks += ids.length;
    completedCount += monthCompleted;

    const monthRatio = ids.length > 0 ? monthCompleted / ids.length : 0;
    overallAccum += monthRatio;
  });

  const monthsCount = monthNumbers.length || 1;
  const overallProgress = Math.round((overallAccum / monthsCount) * 100);

  const currentMonthTasks = DASHBOARD_MONTH_TASKS[currentMonth] || [];
  const currentMonthCompleted = currentMonthTasks.filter((id) =>
    completedIds.has(id)
  ).length;
  const currentMonthProgress =
    currentMonthTasks.length > 0
      ? Math.round((currentMonthCompleted / currentMonthTasks.length) * 100)
      : 0;

  return {
    currentMonth,
    statistics: {
      totalTasks,
      completedCount,
      overallProgress,
      currentMonthProgress,
    },
  };
}

function getDefaultJourneyStats() {
  return buildStatsFromProgress({
    success: true,
    currentMonth: 1,
    taskCompletions: []
  });
}

async function fetchJourneyStats() {
  try {
    console.log('📊 Fetching journey stats from /api/journey/progress...');

    const response = await fetch('/api/journey/progress', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('⚠️ Journey progress API returned', response.status, '- using default stats');
      return getDefaultJourneyStats();
    }

    const apiData = await response.json();
    if (apiData.success === false) {
      console.warn('⚠️ Journey progress API returned success: false - using default stats');
      return getDefaultJourneyStats();
    }

    const data = buildStatsFromProgress(apiData);

    console.log('✅ Journey stats built from /api/journey/progress:', {
      currentMonth: data.currentMonth,
      overallProgress: data.statistics.overallProgress,
      completedCount: data.statistics.completedCount,
      totalTasks: data.statistics.totalTasks,
      currentMonthProgress: data.statistics.currentMonthProgress,
    });

    return data;
  } catch (error) {
    console.error('❌ Error fetching journey stats:', error);
    return getDefaultJourneyStats();
  }
}

// ============================================
// 2. UPDATE DASHBOARD CARDS WITH REAL DATA
// ============================================
function updateDashboardCards(journeyData) {
  try {
    if (!journeyData) return;

    console.log('🔄 Updating dashboard cards from journey progress data...');

    const stats = journeyData.statistics || {};
    const currentMonth = journeyData.currentMonth || 1;
    // Use the SAME percentage as journey.html: overall journey %,
    // not just current‑month %.
    const overallProgress = stats.overallProgress || 0;
    const currentMonthProgress = stats.currentMonthProgress || 0;
    const completedCount = stats.completedCount || 0;
    const totalTasks = stats.totalTasks || 0;
    const remainingTasks = Math.max(0, totalTasks - completedCount);

    // ✅ CARD 1: Journey Progress (% + Month X of 12)
    const journeyProgressElement = document.getElementById('journeyProgress');
    const journeyMonthElement = document.getElementById('journeyMonth');

    if (journeyProgressElement) {
      journeyProgressElement.textContent = `${overallProgress}%`;
    }
    if (journeyMonthElement) {
      journeyMonthElement.textContent = `Month ${currentMonth} of 12`;
    }

    // ✅ CARD 2: Completed Tasks (X remaining)
    const completedTasksElement = document.getElementById('completedTasksCount');
    const upcomingTasksElement = document.getElementById('upcomingTasksCount');

    if (completedTasksElement) {
      completedTasksElement.textContent = completedCount;
    }
    if (upcomingTasksElement) {
      upcomingTasksElement.textContent = `${remainingTasks} remaining`;
    }

    // ✅ HERO SECTION: Days in Program / Month label
    const daysInProgramText = document.getElementById('daysInProgramText');
    if (daysInProgramText) {
      daysInProgramText.textContent = `Month ${currentMonth} of 12`;
    }

    // Optional: "last updated" helper if page has such an element
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = new Date().toLocaleTimeString();
    }

    console.log('✅ Dashboard cards updated successfully from /api/journey');
  } catch (error) {
    console.error('❌ Error updating dashboard cards:', error);
  }
}

// ============================================
// 3. ARTICLE & APPLICATION STATS (NON-DESTRUCTIVE)
// ============================================
async function fetchArticleStats() {
  try {
    const response = await fetch('/api/ambassador/articles?limit=100', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('⚠️ Error fetching article stats (non-fatal):', error);
    return [];
  }
}

async function fetchApplicationStats() {
  try {
    const response = await fetch('/api/ambassador/applications', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('⚠️ Error fetching application stats (non-fatal):', error);
    return [];
  }
}

function updateArticleStats(articles) {
  const articlesPendingElement = document.getElementById('articlesPendingCount');
  const nextArticleDueElement = document.getElementById('nextArticleDue');

  if (!Array.isArray(articles)) return;

  const pending = articles.filter((a) =>
    ['pending', 'needs_update', 'draft'].includes(a.status)
  ).length;
  const published = articles.filter((a) => a.status === 'published').length;

  if (articlesPendingElement) {
    articlesPendingElement.textContent = pending;
  }

  if (nextArticleDueElement) {
    if (published > 0) {
      nextArticleDueElement.textContent = `${published} published`;
    } else if (articles.length > 0) {
      nextArticleDueElement.textContent = `${articles.length} total`;
    } else {
      nextArticleDueElement.textContent = 'Write your first!';
    }
  }
}

function updateApplicationStats(applications) {
  const applicationsCountElement = document.getElementById('applicationsCount');
  const applicationsStatusElement = document.getElementById('applicationsStatus');

  if (!Array.isArray(applications)) return;

  const pending = applications.filter((a) => a.status === 'pending').length;
  const accepted = applications.filter((a) =>
    ['accepted', 'approved'].includes(a.status)
  ).length;

  if (applicationsCountElement) {
    applicationsCountElement.textContent = applications.length;
  }

  if (applicationsStatusElement) {
    applicationsStatusElement.textContent =
      pending > 0
        ? `${pending} pending review`
        : accepted > 0
          ? `${accepted} accepted`
          : applications.length > 0
            ? `${applications.length} submitted`
            : 'Apply to opportunities';
  }
}

// ============================================
// 4. MAIN INITIALIZATION & PERIODIC REFRESH
// ============================================
async function initializeDashboardStats() {
  try {
    console.log('🚀 Initializing ambassador dashboard stats (non-destructive)...');

    // Light loading state for the main percentage
    const journeyProgressElement = document.getElementById('journeyProgress');
    if (journeyProgressElement && !journeyProgressElement.textContent.trim()) {
      journeyProgressElement.textContent = '...';
    }

    const journeyData = await fetchJourneyStats();
    updateDashboardCards(journeyData);

    // Fetch other stats in parallel (articles & applications)
    const [articles, applications] = await Promise.all([
      fetchArticleStats(),
      fetchApplicationStats()
    ]);

    updateArticleStats(articles);
    updateApplicationStats(applications);

    console.log('✅ Dashboard stats initialized with real-time data');

    // Periodic refresh every 30 seconds
    setInterval(async () => {
      try {
        console.log('🔄 Periodic dashboard stats refresh...');
        const freshJourney = await fetchJourneyStats();
        updateDashboardCards(freshJourney);

        const [freshArticles, freshApplications] = await Promise.all([
          fetchArticleStats(),
          fetchApplicationStats()
        ]);

        updateArticleStats(freshArticles);
        updateApplicationStats(freshApplications);
      } catch (refreshError) {
        console.error('⚠️ Error during periodic stats refresh:', refreshError);
      }
    }, 30000);
  } catch (error) {
    console.error('❌ Failed to initialize dashboard stats:', error);
    const journeyProgressElement = document.getElementById('journeyProgress');
    if (journeyProgressElement && !journeyProgressElement.textContent.trim()) {
      journeyProgressElement.textContent = '--';
    }
  }
}

// ============================================
// 5. AUTO-START ON PAGE LOAD
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboardStats);
} else {
  initializeDashboardStats();
}

// ============================================
// 6. EXPORT FOR MANUAL REFRESH (DEBUG)
// ============================================
window.refreshDashboardStats = initializeDashboardStats;
console.log('💡 TIP: Run refreshDashboardStats() in console to manually refresh stats');

