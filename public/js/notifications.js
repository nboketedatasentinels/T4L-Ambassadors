// ============================================
// GLOBAL NOTIFICATIONS SYSTEM
// This file provides a global notification panel that can be used across all pages
// ============================================

(function() {
  'use strict';

  // Configuration
  const REFRESH_INTERVAL = 30000; // Refresh every 30 seconds
  let refreshTimer = null;
  let isInitialized = false;

  // ============================================
  // INITIALIZE NOTIFICATION SYSTEM
  // ============================================
  let currentUserRole = null;

  async function initNotifications() {
    if (isInitialized) return;
    isInitialized = true;

    console.log('🔔 Initializing global notification system...');

    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return;
      const me = await res.json();
      // Support both admin and ambassador roles
      if (!me || !['admin', 'ambassador'].includes(me.role)) {
        const bellIcons = document.querySelectorAll('.bx-bell');
        bellIcons.forEach(bell => {
          const el = bell.closest('button, div, a, i') || bell;
          if (el) el.style.display = 'none';
        });
        return;
      }
      currentUserRole = me.role;
      console.log('🔔 Notification system for role:', currentUserRole);
    } catch (e) {
      return;
    }

    // Create the notification panel HTML
    createNotificationPanel();

    // Attach click handlers to bell icons
    attachBellClickHandlers();

    // Load notifications
    loadNotifications();

    // Start refresh timer
    startRefreshTimer();

    // Close panel when clicking outside
    document.addEventListener('click', handleOutsideClick);

    console.log('✅ Notification system initialized for', currentUserRole);
  }

  // ============================================
  // CREATE NOTIFICATION PANEL HTML
  // ============================================
  function createNotificationPanel() {
    // Check if panel already exists
    if (document.getElementById('globalNotificationPanel')) return;

    const panelHTML = `
      <!-- Global Notification Panel Overlay -->
      <div id="notificationOverlay" class="notification-overlay hidden"></div>
      
      <!-- Global Notification Panel -->
      <div id="globalNotificationPanel" class="notification-panel hidden">
        <div class="notification-panel-header">
          <h3 class="notification-panel-title">
            <i class="bx bx-bell"></i>
            Notifications
          </h3>
          <div class="notification-panel-actions">
            <button id="markAllReadBtn" class="notification-mark-all-btn" title="Mark all as read">
              <i class="bx bx-check-double"></i>
            </button>
            <button id="closeNotificationPanel" class="notification-close-btn" title="Close">
              <i class="bx bx-x"></i>
            </button>
          </div>
        </div>
        
        <div class="notification-panel-tabs">
          <button class="notification-tab active" data-tab="all">All</button>
          <button class="notification-tab" data-tab="unread">Unread</button>
        </div>
        
        <div id="notificationList" class="notification-list">
          <div class="notification-loading">
            <div class="notification-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        </div>
        
        <div class="notification-panel-footer">
          <span id="notificationCount" class="notification-footer-count">0 notifications</span>
        </div>
      </div>
    `;

    // Add the panel to the body
    const panelContainer = document.createElement('div');
    panelContainer.id = 'notificationContainer';
    panelContainer.innerHTML = panelHTML;
    document.body.appendChild(panelContainer);

    // Add CSS if not already added
    addNotificationStyles();

    // Attach panel event handlers
    attachPanelEventHandlers();
  }

  // ============================================
  // ADD NOTIFICATION STYLES
  // ============================================
  function addNotificationStyles() {
    if (document.getElementById('notificationStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'notificationStyles';
    styles.textContent = `
      /* Notification Overlay */
      .notification-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 9998;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .notification-overlay.visible {
        opacity: 1;
      }
      
      .notification-overlay.hidden {
        display: none;
      }

      /* Notification Panel */
      .notification-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        max-width: 420px;
        height: 100vh;
        background: white;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }
      
      .notification-panel.visible {
        transform: translateX(0);
      }
      
      .notification-panel.hidden {
        transform: translateX(100%);
      }

      /* Panel Header */
      .notification-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #4b0d7f 0%, #6b1fa0 100%);
        color: white;
      }
      
      .notification-panel-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
      }
      
      .notification-panel-title i {
        font-size: 1.5rem;
      }
      
      .notification-panel-actions {
        display: flex;
        gap: 0.5rem;
      }
      
      .notification-mark-all-btn,
      .notification-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .notification-mark-all-btn:hover,
      .notification-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }
      
      .notification-mark-all-btn i,
      .notification-close-btn i {
        font-size: 1.25rem;
      }

      /* Tabs */
      .notification-panel-tabs {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }
      
      .notification-tab {
        flex: 1;
        padding: 0.875rem 1rem;
        border: none;
        background: transparent;
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .notification-tab:hover {
        color: #4b0d7f;
        background: rgba(75, 13, 127, 0.05);
      }
      
      .notification-tab.active {
        color: #4b0d7f;
        background: white;
      }
      
      .notification-tab.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 3px;
        background: #4b0d7f;
        border-radius: 3px 3px 0 0;
      }

      /* Notification List */
      .notification-list {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }
      
      .notification-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        color: #6b7280;
      }
      
      .notification-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top-color: #4b0d7f;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Empty State */
      .notification-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
      }
      
      .notification-empty i {
        font-size: 4rem;
        color: #d1d5db;
        margin-bottom: 1rem;
      }
      
      .notification-empty h4 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem;
      }
      
      .notification-empty p {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      /* Notification Item */
      .notification-item {
        display: flex;
        gap: 1rem;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;
      }
      
      .notification-item:hover {
        background: #f9fafb;
      }
      
      .notification-item.unread {
        background: linear-gradient(90deg, rgba(75, 13, 127, 0.08) 0%, transparent 100%);
        border-left: 3px solid #4b0d7f;
      }
      
      .notification-item.unread:hover {
        background: linear-gradient(90deg, rgba(75, 13, 127, 0.12) 0%, #f9fafb 100%);
      }

      /* Notification Icon */
      .notification-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .notification-icon i {
        font-size: 1.25rem;
        color: white;
      }
      
      .notification-icon.type-application_submitted,
      .notification-icon.type-application_status_change {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }
      
      .notification-icon.type-service_request,
      .notification-icon.type-service_request_sent,
      .notification-icon.type-service_request_status {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      }
      
      .notification-icon.type-article,
      .notification-icon.type-needs_update {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }
      
      .notification-icon.type-ready_to_publish,
      .notification-icon.type-article_published {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .notification-icon.type-ambassador_consent {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      }

      .notification-icon.type-article_rejected {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      
      .notification-icon.type-article_pending {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }
      
      .notification-icon.type-default {
        background: linear-gradient(135deg, #4b0d7f 0%, #6b1fa0 100%);
      }

      /* Notification Content */
      .notification-content {
        flex: 1;
        min-width: 0;
      }
      
      .notification-title {
        font-size: 0.9375rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.25rem;
        line-height: 1.4;
      }
      
      .notification-message {
        font-size: 0.8125rem;
        color: #6b7280;
        margin: 0 0 0.5rem;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .notification-time {
        font-size: 0.75rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      
      .notification-time i {
        font-size: 0.875rem;
      }

      /* Unread Indicator */
      .notification-unread-dot {
        width: 8px;
        height: 8px;
        background: #4b0d7f;
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 0.5rem;
      }

      /* Panel Footer */
      .notification-panel-footer {
        padding: 1rem 1.5rem;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
      
      .notification-footer-count {
        font-size: 0.8125rem;
        color: #6b7280;
      }

      /* Bell Icon Badge */
      .notification-bell-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        background: #ef4444;
        color: white;
        font-size: 0.6875rem;
        font-weight: 700;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
        animation: pulse-badge 2s ease-in-out infinite;
      }
      
      @keyframes pulse-badge {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      /* Responsive */
      @media (max-width: 480px) {
        .notification-panel {
          max-width: 100%;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // ============================================
  // ATTACH BELL CLICK HANDLERS
  // ============================================
  function attachBellClickHandlers() {
    // Find all bell icons on the page
    const bellIcons = document.querySelectorAll('.bx-bell');
    
    bellIcons.forEach(bell => {
      // Get the parent element (usually a button or div)
      const bellContainer = bell.closest('button, div, a, i');
      
      if (bellContainer && !bellContainer.hasAttribute('data-notification-attached')) {
        bellContainer.setAttribute('data-notification-attached', 'true');
        bellContainer.style.cursor = 'pointer';
        bellContainer.style.position = 'relative';
        
        bellContainer.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleNotificationPanel();
        });
        
        console.log('🔔 Attached click handler to bell icon');
      }
    });
  }

  // ============================================
  // ATTACH PANEL EVENT HANDLERS
  // ============================================
  function attachPanelEventHandlers() {
    // Close button
    const closeBtn = document.getElementById('closeNotificationPanel');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideNotificationPanel);
    }

    // Overlay click
    const overlay = document.getElementById('notificationOverlay');
    if (overlay) {
      overlay.addEventListener('click', hideNotificationPanel);
    }

    // Mark all as read
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', markAllAsRead);
    }

    // Tab switching
    const tabs = document.querySelectorAll('.notification-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-tab');
        loadNotifications(filter === 'unread');
      });
    });
  }

  // ============================================
  // TOGGLE NOTIFICATION PANEL
  // ============================================
  function toggleNotificationPanel() {
    const panel = document.getElementById('globalNotificationPanel');
    const overlay = document.getElementById('notificationOverlay');
    
    if (panel && overlay) {
      const isVisible = panel.classList.contains('visible');
      
      if (isVisible) {
        hideNotificationPanel();
      } else {
        showNotificationPanel();
      }
    }
  }

  // ============================================
  // SHOW NOTIFICATION PANEL
  // ============================================
  function showNotificationPanel() {
    const panel = document.getElementById('globalNotificationPanel');
    const overlay = document.getElementById('notificationOverlay');
    
    if (panel && overlay) {
      overlay.classList.remove('hidden');
      panel.classList.remove('hidden');
      
      // Trigger reflow for animation
      void panel.offsetWidth;
      
      overlay.classList.add('visible');
      panel.classList.add('visible');
      
      // Refresh notifications when panel opens
      loadNotifications();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
  }

  // ============================================
  // HIDE NOTIFICATION PANEL
  // ============================================
  function hideNotificationPanel() {
    const panel = document.getElementById('globalNotificationPanel');
    const overlay = document.getElementById('notificationOverlay');
    
    if (panel && overlay) {
      panel.classList.remove('visible');
      overlay.classList.remove('visible');
      
      setTimeout(() => {
        panel.classList.add('hidden');
        overlay.classList.add('hidden');
      }, 300);
      
      // Restore body scroll
      document.body.style.overflow = '';
    }
  }

  // ============================================
  // HANDLE OUTSIDE CLICK
  // ============================================
  function handleOutsideClick(e) {
    const panel = document.getElementById('globalNotificationPanel');
    if (panel && panel.classList.contains('visible')) {
      if (!panel.contains(e.target) && !e.target.closest('.bx-bell') && !e.target.closest('[data-notification-attached]')) {
        hideNotificationPanel();
      }
    }
  }

  // ============================================
  // LOAD NOTIFICATIONS
  // ============================================
  async function loadNotifications(unreadOnly = false) {
    const listContainer = document.getElementById('notificationList');
    if (!listContainer) return;

    try {
      const url = unreadOnly ? '/api/notifications?unread=true' : '/api/notifications';
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, skipping notifications');
          return;
        }
        throw new Error('Failed to load notifications');
      }

      const data = await response.json();
      const notifications = data.notifications || [];
      const unreadCount = data.unreadCount || 0;

      // Update badge on bell icons
      updateBellBadge(unreadCount);

      // Update footer count
      const countElement = document.getElementById('notificationCount');
      if (countElement) {
        const text = notifications.length === 1 ? '1 notification' : `${notifications.length} notifications`;
        countElement.textContent = text;
      }

      // Render notifications
      if (notifications.length === 0) {
        listContainer.innerHTML = `
          <div class="notification-empty">
            <i class="bx bx-bell-off"></i>
            <h4>${unreadOnly ? 'No unread notifications' : 'No notifications yet'}</h4>
            <p>You're all caught up!</p>
          </div>
        `;
      } else {
        listContainer.innerHTML = notifications.map(notif => renderNotificationItem(notif)).join('');
        
        // Attach click handlers to notification items
        listContainer.querySelectorAll('.notification-item').forEach(item => {
          item.addEventListener('click', () => handleNotificationClick(item.dataset.id, item.dataset.link));
        });
      }

    } catch (error) {
      console.error('Error loading notifications:', error);
      listContainer.innerHTML = `
        <div class="notification-empty">
          <i class="bx bx-error-circle"></i>
          <h4>Failed to load notifications</h4>
          <p>Please try again later</p>
        </div>
      `;
    }
  }

  // ============================================
  // RENDER NOTIFICATION ITEM
  // ============================================
  function renderNotificationItem(notif) {
    const iconClass = getNotificationIconClass(notif.type);
    const icon = getNotificationIcon(notif.type);
    const timeAgo = formatTimeAgo(notif.created_at);
    const isUnread = !notif.read;

    return `
      <div class="notification-item ${isUnread ? 'unread' : ''}" 
           data-id="${notif.notification_id}" 
           data-link="${notif.link || ''}">
        <div class="notification-icon ${iconClass}">
          <i class="bx ${icon}"></i>
        </div>
        <div class="notification-content">
          <h4 class="notification-title">${escapeHtml(notif.title)}</h4>
          <p class="notification-message">${escapeHtml(notif.message)}</p>
          <span class="notification-time">
            <i class="bx bx-time-five"></i>
            ${timeAgo}
          </span>
        </div>
        ${isUnread ? '<div class="notification-unread-dot"></div>' : ''}
      </div>
    `;
  }

  // ============================================
  // GET NOTIFICATION ICON CLASS
  // ============================================
  function getNotificationIconClass(type) {
    // Normalize type to handle both old format (article_approved) and new direct format (approved)
    const normalizedType = (type || '').toLowerCase().replace('article_', '');
    
    const typeClasses = {
      'application_submitted': 'type-application_submitted',
      'application_status_change': 'type-application_status_change',
      'service_request': 'type-service_request',
      'service_request_sent': 'type-service_request_sent',
      'service_request_status': 'type-service_request_status',
      'needs_update': 'type-needs_update',
      'ready_to_publish': 'type-ready_to_publish',
      'published': 'type-article_published',
      'approved': 'type-ready_to_publish',
      'rejected': 'type-article_rejected',
      'pending': 'type-article_pending',
      'submitted': 'type-application_submitted',
      'ambassador_consent': 'type-ambassador_consent'
    };
    return typeClasses[normalizedType] || typeClasses[type] || 'type-default';
  }

  // ============================================
  // GET NOTIFICATION ICON
  // ============================================
  function getNotificationIcon(type) {
    // Normalize type to handle both old format (article_approved) and new direct format (approved)
    const normalizedType = (type || '').toLowerCase().replace('article_', '');
    
    const icons = {
      'application_submitted': 'bx-send',
      'application_status_change': 'bx-check-circle',
      'service_request': 'bx-briefcase-alt-2',
      'service_request_sent': 'bx-send',
      'service_request_status': 'bx-briefcase-alt-2',
      'needs_update': 'bx-edit',
      'ready_to_publish': 'bx-rocket',
      'published': 'bx-party',
      'approved': 'bx-check-circle',
      'rejected': 'bx-x-circle',
      'pending': 'bx-time-five',
      'submitted': 'bx-file',
      'ambassador_consent': 'bx-check-shield'
    };
    return icons[normalizedType] || icons[type] || 'bx-bell';
  }

  // ============================================
  // FORMAT TIME AGO
  // ============================================
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  // ============================================
  // ESCAPE HTML
  // ============================================
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // HANDLE NOTIFICATION CLICK
  // ============================================
  async function handleNotificationClick(notificationId, link) {
    // Mark as read
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      // Update UI
      const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
      if (item) {
        item.classList.remove('unread');
        const dot = item.querySelector('.notification-unread-dot');
        if (dot) dot.remove();
      }
      
      // Update badge count
      loadNotifications();
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    
    // Navigate to link if provided
    if (link) {
      hideNotificationPanel();
      window.location.href = link;
    }
  }

  // ============================================
  // MARK ALL AS READ
  // ============================================
  async function markAllAsRead() {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Reload notifications
        loadNotifications();
        
        // Show success feedback
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
          markAllBtn.innerHTML = '<i class="bx bx-check"></i>';
          setTimeout(() => {
            markAllBtn.innerHTML = '<i class="bx bx-check-double"></i>';
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  // ============================================
  // UPDATE BELL BADGE
  // ============================================
  function updateBellBadge(count) {
    // Find all bell icons
    const bellContainers = document.querySelectorAll('[data-notification-attached]');
    
    bellContainers.forEach(container => {
      // Remove existing badge
      const existingBadge = container.querySelector('.notification-bell-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      // Add new badge if count > 0
      if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-bell-badge';
        badge.textContent = count > 99 ? '99+' : count;
        container.appendChild(badge);
      }
    });
  }

  // ============================================
  // START REFRESH TIMER
  // ============================================
  function startRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    
    refreshTimer = setInterval(() => {
      // Only refresh if panel is not visible (to avoid confusion)
      const panel = document.getElementById('globalNotificationPanel');
      if (panel && !panel.classList.contains('visible')) {
        fetch('/api/notifications?limit=1', { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            updateBellBadge(data.unreadCount || 0);
          })
          .catch(() => {}); // Silently fail
      }
    }, REFRESH_INTERVAL);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.T4LNotifications = {
    init: initNotifications,
    show: showNotificationPanel,
    hide: hideNotificationPanel,
    refresh: loadNotifications
  };

  // ============================================
  // AUTO-INITIALIZE ON DOM READY
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
  } else {
    initNotifications();
  }

})();

