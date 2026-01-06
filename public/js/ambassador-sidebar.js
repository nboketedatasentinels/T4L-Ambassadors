// ============================================
// GLOBAL AMBASSADOR SIDEBAR
// This file provides a global sidebar for all ambassador portal pages
// ============================================

(function() {
  'use strict';

  // Check if we should skip initialization (for partner/admin pages or pages with their own sidebar)
  const SKIP_PAGES = [
    'partner-dashboard.html',
    'partner-signin.html',
    'partner-signup.html',
    'admin-dashboard.html',
    'admin-signin.html',
    'admin-signup.html',
    'admin-add-user.html',
    'admin-journey-tracker.html',
    'applications.html',
    'application-details.html',
    'creat-Post.html',
    'CommunityPartView.html',
    'signin.html',
    'signup.html',
    'index.html',
    'journey.html'  // Has its own React-based sidebar
  ];

  // Pages that need role check before showing sidebar
  const ROLE_CHECK_PAGES = ['profile.html'];

  const currentPage = window.location.pathname.split('/').pop() || '';
  if (SKIP_PAGES.includes(currentPage)) {
    console.log('📱 Skipping ambassador sidebar for:', currentPage);
    return;
  }

  // For role-check pages, we'll initialize after checking the role
  let needsRoleCheck = ROLE_CHECK_PAGES.includes(currentPage);

  // Navigation items configuration
  const NAV_ITEMS = [
    { href: '/ambassador-dashboard.html', icon: 'bxs-home', label: 'Home', id: 'home' },
    { href: '/article-amb.html', icon: 'bx-edit-alt', label: 'Publishing', id: 'publishing' },
    { href: '/journey.html', icon: 'bx-check-square', label: 'Task', id: 'task' },
    { href: '/Impactlog.html', icon: 'bx-line-chart', label: 'Impact Log', id: 'journey' },
    { href: '/Partner-Calls.html', icon: 'bx-briefcase', label: 'Partners', id: 'partners' },
    { href: '/services.html', icon: 'bx-briefcase-alt-2', label: 'Services', id: 'services' },
    { href: '/media-library.html', icon: 'bx-image', label: 'Media Kit', id: 'media' },
    { href: 'https://www.t4leader.com/event', icon: 'bx-calendar-event', label: 'Events', id: 'events', external: true },
    { href: '/profile.html', icon: 'bx-user', label: 'Profile', id: 'profile' },
    { href: '/profile.html', icon: 'bx-cog', label: 'Settings', id: 'settings' }
  ];

  // Page to nav item mapping for active state
  const PAGE_MAPPING = {
    'ambassador-dashboard.html': 'home',
    'article-amb.html': 'publishing',
    'article-progress.html': 'publishing',
    'ambassador-review.html': 'publishing',
    'journey.html': 'journey',
    'Impactlog.html': 'journey',
    'Partner-Calls.html': 'partners',
    'services.html': 'services',
    'my-services.html': 'services',
    'create-service.html': 'services',
    'media-library.html': 'media',
    'profile.html': 'profile',
    'chat-pillar.html': 'partners',
    'chat-region.html': 'partners'
  };

  let isInitialized = false;

  // ============================================
  // INITIALIZE SIDEBAR
  // ============================================
  function initSidebar() {
    if (isInitialized) return;
    isInitialized = true;

    console.log('📱 Initializing global ambassador sidebar...');

    // Add sidebar styles
    addSidebarStyles();

    // Create sidebar HTML
    createSidebar();

    // Setup event handlers
    setupEventHandlers();

    console.log('✅ Ambassador sidebar initialized');
  }

  // ============================================
  // ADD SIDEBAR STYLES
  // ============================================
  function addSidebarStyles() {
    if (document.getElementById('ambassadorSidebarStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'ambassadorSidebarStyles';
    styles.textContent = `
      /* Mobile Sidebar Toggle Button */
      .amb-sidebar-toggle {
        display: none;
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 50;
        background: #4b0d7f;
        color: white;
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(75, 13, 127, 0.3);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .amb-sidebar-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(75, 13, 127, 0.4);
      }
      
      .amb-sidebar-toggle i {
        font-size: 1.5rem;
      }

      /* Mobile Overlay */
      .amb-sidebar-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 40;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .amb-sidebar-overlay.active {
        display: block;
        opacity: 1;
      }

      /* Sidebar Container */
      .amb-sidebar {
        width: 80px;
        min-width: 80px;
        background: white;
        box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.5rem 0;
        z-index: 45;
        height: 100vh;
        position: sticky;
        top: 0;
        transition: transform 0.3s ease;
      }

      /* Logo */
      .amb-sidebar-logo {
        background: #4b0d7f;
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 0.75rem;
        font-weight: 700;
        font-size: 0.875rem;
        margin-bottom: 1.5rem;
        letter-spacing: 0.5px;
      }

      /* Navigation */
      .amb-sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 100%;
        padding: 0 0.5rem;
        flex: 1;
      }

      /* Nav Link */
      .amb-nav-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.625rem 0.5rem;
        border-radius: 0.625rem;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #6b7280;
      }
      
      .amb-nav-link:hover {
        background: rgba(75, 13, 127, 0.08);
        color: #4b0d9f;
      }
      
      .amb-nav-link:hover i {
        transform: scale(1.1);
      }
      
      .amb-nav-link.active {
        background: rgba(75, 13, 127, 0.1);
        color: #4b0d9f;
      }
      
      .amb-nav-link i {
        font-size: 1.5rem;
        transition: transform 0.2s ease;
      }
      
      .amb-nav-link span {
        font-size: 0.625rem;
        margin-top: 0.375rem;
        font-weight: 500;
        text-align: center;
        line-height: 1.2;
      }

      /* Logout Link */
      .amb-nav-link.logout:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }

      /* Spacer */
      .amb-nav-spacer {
        flex: 1;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .amb-sidebar-toggle {
          display: flex;
        }
        
        .amb-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          transform: translateX(-100%);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
        }
        
        .amb-sidebar.active {
          transform: translateX(0);
        }
        
        /* Add left padding to main content on mobile */
        .amb-main-content {
          padding-left: 1rem !important;
        }
      }

      /* Ensure the layout container uses flexbox */
      .amb-layout {
        display: flex;
        min-height: 100vh;
      }

      /* Main content area */
      .amb-main-content {
        flex: 1;
        min-width: 0;
        overflow-x: hidden;
      }
    `;

    document.head.appendChild(styles);
  }

  // ============================================
  // CREATE SIDEBAR HTML
  // ============================================
  function createSidebar() {
    // Check if sidebar already exists
    if (document.getElementById('ambGlobalSidebar')) return;

    // Remove any existing sidebar elements
    const existingSidebar = document.querySelector('aside.sidebar');
    const existingToggle = document.querySelector('.sidebar-toggle, #sidebarToggle');
    const existingOverlay = document.querySelector('.overlay, #overlay');
    
    // Get the current page to determine active state
    const currentPage = window.location.pathname.split('/').pop() || 'ambassador-dashboard.html';
    const activeNavId = PAGE_MAPPING[currentPage] || 'home';

    // Build navigation HTML
    const navHTML = NAV_ITEMS.map(item => {
      const isActive = item.id === activeNavId;
      const activeClass = isActive ? 'active' : '';
      const iconClass = isActive && item.icon === 'bx-home' ? 'bxs-home' : item.icon;
      const target = item.external ? 'target="_blank" rel="noopener noreferrer"' : '';
      
      return `
        <a href="${item.href}" class="amb-nav-link ${activeClass}" data-nav-id="${item.id}" ${target}>
          <i class="bx ${iconClass}"></i>
          <span>${item.label}</span>
        </a>
      `;
    }).join('');

    // Create sidebar container
    const sidebarHTML = `
      <!-- Mobile Toggle Button -->
      <button class="amb-sidebar-toggle" id="ambSidebarToggle">
        <i class="bx bx-menu"></i>
      </button>
      
      <!-- Mobile Overlay -->
      <div class="amb-sidebar-overlay" id="ambSidebarOverlay"></div>
      
      <!-- Sidebar -->
      <aside class="amb-sidebar" id="ambGlobalSidebar">
        <div class="amb-sidebar-logo">T4L</div>
        <nav class="amb-sidebar-nav">
          ${navHTML}
          <div class="amb-nav-spacer"></div>
          <div class="amb-nav-link logout" id="ambLogoutBtn">
            <i class="bx bx-log-out"></i>
            <span>Logout</span>
          </div>
        </nav>
      </aside>
    `;

    // Find the body or the main flex container
    const body = document.body;
    
    // Check if there's already a flex container
    let layoutContainer = body.querySelector('.flex.min-h-screen');
    
    if (layoutContainer) {
      // Remove existing sidebar elements from the layout container
      if (existingSidebar && layoutContainer.contains(existingSidebar)) {
        existingSidebar.remove();
      }
      
      // Remove existing toggle and overlay from body
      if (existingToggle) existingToggle.remove();
      if (existingOverlay) existingOverlay.remove();
      
      // Add our global sidebar elements
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'ambSidebarContainer';
      sidebarContainer.innerHTML = sidebarHTML;
      
      // Insert toggle and overlay at beginning of body
      const toggle = sidebarContainer.querySelector('.amb-sidebar-toggle');
      const overlay = sidebarContainer.querySelector('.amb-sidebar-overlay');
      body.insertBefore(overlay, body.firstChild);
      body.insertBefore(toggle, body.firstChild);
      
      // Insert sidebar at beginning of layout container
      const sidebar = sidebarContainer.querySelector('.amb-sidebar');
      layoutContainer.insertBefore(sidebar, layoutContainer.firstChild);
      
      // Add class to layout container
      layoutContainer.classList.add('amb-layout');
      
      // Add class to main content
      const mainContent = layoutContainer.querySelector('main');
      if (mainContent) {
        mainContent.classList.add('amb-main-content');
      }
    } else {
      // No existing flex container, wrap body content
      const bodyContent = document.createElement('div');
      bodyContent.innerHTML = body.innerHTML;
      
      // Clear body
      body.innerHTML = '';
      
      // Create layout
      const layoutDiv = document.createElement('div');
      layoutDiv.className = 'amb-layout flex min-h-screen';
      layoutDiv.innerHTML = sidebarHTML;
      
      // Move content after sidebar
      const mainWrapper = document.createElement('main');
      mainWrapper.className = 'amb-main-content flex-1';
      mainWrapper.innerHTML = bodyContent.innerHTML;
      
      layoutDiv.appendChild(mainWrapper);
      body.appendChild(layoutDiv);
    }

    console.log('📱 Sidebar HTML created');
  }

  // ============================================
  // SETUP EVENT HANDLERS
  // ============================================
  function setupEventHandlers() {
    // Mobile toggle
    const toggle = document.getElementById('ambSidebarToggle');
    const sidebar = document.getElementById('ambGlobalSidebar');
    const overlay = document.getElementById('ambSidebarOverlay');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      });
    }

    // Logout handler
    const logoutBtn = document.getElementById('ambLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Also handle any existing logout buttons
    const existingLogoutBtn = document.getElementById('logoutBtn');
    if (existingLogoutBtn && existingLogoutBtn !== logoutBtn) {
      existingLogoutBtn.addEventListener('click', handleLogout);
    }
  }

  // ============================================
  // HANDLE LOGOUT
  // ============================================
  function handleLogout() {
    console.log('🚪 Logging out...');
    
    fetch('/api/logout', { 
      method: 'POST',
      credentials: 'include'
    })
    .then(() => {
      window.location.href = '/signin';
    })
    .catch(error => {
      console.error('Logout error:', error);
      // Try alternate logout endpoint
      fetch('/logout', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '/signin')
        .catch(() => window.location.href = '/signin');
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.T4LAmbassadorSidebar = {
    init: initSidebar,
    setActive: function(navId) {
      document.querySelectorAll('.amb-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.navId === navId) {
          link.classList.add('active');
        }
      });
    }
  };

  // ============================================
  // CHECK USER ROLE FOR SHARED PAGES
  // ============================================
  async function checkUserRole() {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (!response.ok) return null;
      const data = await response.json();
      return data.role;
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // AUTO-INITIALIZE ON DOM READY
  // ============================================
  async function autoInit() {
    if (needsRoleCheck) {
      const role = await checkUserRole();
      if (role !== 'ambassador') {
        console.log('📱 User is not an ambassador, skipping sidebar');
        return;
      }
    }
    initSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();

