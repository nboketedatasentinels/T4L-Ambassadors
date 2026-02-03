// ============================================
// SUBSCRIPTION ACCESS CONTROL
// Manages subscription-based feature access for ambassadors
// ============================================

class SubscriptionManager {
  constructor() {
    this.subscriptionType = null;
    this.hasFullAccess = false;
    this.freeFeatures = ['events', 'partners', 'impact-log', 'chat'];
  }

  async checkSubscription() {
    try {
      const response = await fetch('/api/ambassador/subscription', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to check subscription');
      }
      
      const data = await response.json();
      this.subscriptionType = data.subscription_type;
      this.hasFullAccess = data.has_full_access;
      
      console.log('✅ Subscription loaded:', {
        type: this.subscriptionType,
        hasFullAccess: this.hasFullAccess
      });
      
      return data;
    } catch (error) {
      console.error('❌ Subscription check failed:', error);
      this.subscriptionType = 'free';
      this.hasFullAccess = false;
      return { subscription_type: 'free', has_full_access: false };
    }
  }

  isFeatureAllowed(featureName) {
    // Paid users have access to everything
    if (this.hasFullAccess) {
      return true;
    }
    
    // Free users only have access to specific features
    return this.freeFeatures.includes(featureName);
  }

  // Show skeleton in sidebar while subscription is loading (so free users don't see full nav and click)
  showSidebarSkeleton() {
    const sidebar = document.querySelector('.sidebar, aside.sidebar');
    if (!sidebar) return;
    const nav = sidebar.querySelector('nav');
    if (!nav) return;
    nav.setAttribute('data-subscription-nav', 'true');
    nav.style.visibility = 'hidden';
    nav.style.position = 'absolute';
    nav.style.pointerEvents = 'none';
    const skeleton = document.createElement('div');
    skeleton.id = 'sidebar-skeleton-container';
    skeleton.className = 'flex flex-col space-y-4 text-gray-700 w-full';
    const count = 10;
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'flex flex-col items-center py-2 px-3 rounded-lg';
      item.innerHTML = `
        <div class="sidebar-skeleton-icon w-8 h-8 rounded-lg bg-gray-200"></div>
        <div class="sidebar-skeleton-text mt-1.5 h-3 w-10 rounded bg-gray-200"></div>
      `;
      skeleton.appendChild(item);
    }
    nav.parentNode.insertBefore(skeleton, nav);
  }

  hideSidebarSkeletonShowNav() {
    const skeleton = document.getElementById('sidebar-skeleton-container');
    if (skeleton) skeleton.remove();
    const nav = document.querySelector('.sidebar nav[data-subscription-nav], aside.sidebar nav[data-subscription-nav]');
    if (nav) {
      nav.style.visibility = '';
      nav.style.position = '';
      nav.style.pointerEvents = '';
      nav.removeAttribute('data-subscription-nav');
    }
  }

  // Temporarily block paid-only sidebar links and show a small spinner
  setSidebarLoading(isLoading) {
    try {
      const links = document.querySelectorAll('.sidebar a, aside.sidebar a');
      links.forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        let featureName = null;

        if (href.includes('ambassador-events') || (href.includes('events') && !href.includes('journey'))) {
          featureName = 'events';
        } else if (href.includes('partner-calls') || (href.includes('partner') && !href.includes('partner-dashboard'))) {
          featureName = 'partners';
        } else if (href.includes('impactlog') || href.includes('impact-log')) {
          featureName = 'impact-log';
        } else if (href.includes('chat-pillar') || (href.includes('chat') && !href.includes('chat-region'))) {
          featureName = 'chat';
        } else if (href.includes('journey')) {
          featureName = 'journey';
        } else if (href.includes('article')) {
          featureName = 'articles';
        } else if (href.includes('profile-ambassador') || (href.includes('profile') && !href.includes('profile-partner'))) {
          featureName = 'profile';
        } else if ((href.includes('service') || href.includes('my-services')) && !href.includes('services-partner')) {
          featureName = 'services';
        } else if (href.includes('media-library') || href.includes('media-kit')) {
          featureName = 'media-kit';
        }

        // Only apply loading state to features that are NOT in the free list
        if (!featureName || this.freeFeatures.includes(featureName)) {
          return;
        }

        if (isLoading) {
          link.classList.add('subscription-loading');
        } else {
          link.classList.remove('subscription-loading');
        }
      });
    } catch (e) {
      console.warn('Subscription sidebar loading toggle failed:', e);
    }
  }

  restrictNavigation() {
    // Get all navigation links - prioritize sidebar links
    const sidebarLinks = document.querySelectorAll('.sidebar a, aside a, nav.sidebar a');
    const navLinks = document.querySelectorAll('nav a, .nav-link, .sidebar-link, a[href]');
    
    // Combine and deduplicate
    const allLinks = new Set([...sidebarLinks, ...navLinks]);
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
      
      // Determine feature from URL (check both relative and absolute paths)
      let featureName = null;
      const hrefLower = href.toLowerCase();
      
      // Check for events (allow external events link for free users)
      if (hrefLower.includes('ambassador-events') || (hrefLower.includes('events') && !hrefLower.includes('journey'))) {
        featureName = 'events';
      } else if (hrefLower.includes('partner-calls') || (hrefLower.includes('partner') && !hrefLower.includes('partner-dashboard'))) {
        featureName = 'partners';
      } else if (hrefLower.includes('impactlog') || hrefLower.includes('impact-log')) {
        featureName = 'impact-log';
      } else if (hrefLower.includes('chat-pillar') || (hrefLower.includes('chat') && !hrefLower.includes('chat-region'))) {
        featureName = 'chat';
      } else if (hrefLower.includes('journey')) {
        featureName = 'journey';
      } else if (hrefLower.includes('article')) {
        featureName = 'articles';
      } else if (hrefLower.includes('profile-ambassador') || (hrefLower.includes('profile') && !hrefLower.includes('profile-partner'))) {
        featureName = 'profile';
      } else if ((hrefLower.includes('service') || hrefLower.includes('my-services')) && !hrefLower.includes('services-partner')) {
        featureName = 'services';
      } else if (hrefLower.includes('media-library') || hrefLower.includes('media-kit')) {
        featureName = 'media-kit';
      }
      
      // If feature requires paid subscription
      if (featureName && !this.isFeatureAllowed(featureName)) {
        // Add visual indicator
        link.style.opacity = '0.5';
        link.style.position = 'relative';
        
        // Add lock icon if not already present
        if (!link.querySelector('.lock-icon')) {
          const lockIcon = document.createElement('i');
          lockIcon.className = 'fas fa-lock lock-icon';
          lockIcon.style.cssText = 'margin-left: 8px; font-size: 12px; color: #4b0d7f;';
          link.appendChild(lockIcon);
        }
        
        // Prevent navigation and show upgrade modal
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.showUpgradeModal(featureName);
        }, { once: false });
      }
    });
  }

  showUpgradeModal(featureName) {
    // Create modal HTML
    const modalHTML = `
      <div id="subscriptionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" style="animation: fadeIn 0.2s ease;">
        <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl" style="animation: slideUp 0.3s ease;">
          <div class="p-6 border-b border-gray-200" style="background: linear-gradient(to right, #4b0d7f, #a36737);">
            <div class="flex items-center gap-3">
              <i class="fas fa-crown text-white text-3xl"></i>
              <div>
                <h3 class="text-2xl font-bold text-white">Upgrade Required</h3>
                <p class="text-white/90 text-sm">Unlock this feature with a paid subscription</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="mb-6">
              <div class="flex items-start gap-3 mb-4">
                <i class="fas fa-info-circle text-[#4b0d7f] text-xl mt-0.5"></i>
                <div>
                  <p class="text-gray-700 mb-2">
                    You're currently on a <strong>Free</strong> subscription which includes:
                  </p>
                  <ul class="text-sm text-gray-600 space-y-1.5">
                    <li class="flex items-center gap-2"><i class="fas fa-check-circle text-green-600 text-xs"></i> Access to Events</li>
                    <li class="flex items-center gap-2"><i class="fas fa-check-circle text-green-600 text-xs"></i> Visibility Opportunities</li>
                    <li class="flex items-center gap-2"><i class="fas fa-check-circle text-green-600 text-xs"></i> Impact Log</li>
                    <li class="flex items-center gap-2"><i class="fas fa-check-circle text-green-600 text-xs"></i> Chat & Communication</li>
                  </ul>
                </div>
              </div>
              
              <div class="bg-gradient-to-br from-purple-50 to-[#f5e6d3] border-2 border-purple-200 rounded-xl p-4">
                <div class="flex items-start gap-3">
                  <i class="fas fa-star text-[#4b0d7f] text-xl mt-0.5"></i>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-2">Upgrade to Paid for Full Access:</h4>
                    <ul class="text-sm text-gray-700 space-y-1.5">
                      <li class="flex items-center gap-2"><i class="fas fa-rocket text-[#4b0d7f] text-xs"></i> Journey Progress Tracking</li>
                      <li class="flex items-center gap-2"><i class="fas fa-file-alt text-[#4b0d7f] text-xs"></i> Article Publishing</li>
                      <li class="flex items-center gap-2"><i class="fas fa-user-cog text-[#4b0d7f] text-xs"></i> Advanced Profile Features</li>
                      <li class="flex items-center gap-2"><i class="fas fa-briefcase text-[#4b0d7f] text-xs"></i> Professional Services</li>
                      <li class="flex items-center gap-2"><i class="fas fa-image text-[#4b0d7f] text-xs"></i> Media Kit Access</li>
                      <li class="flex items-center gap-2"><i class="fas fa-chart-line text-[#4b0d7f] text-xs"></i> Analytics & Insights</li>
                      <li class="flex items-center gap-2"><i class="fas fa-headset text-[#4b0d7f] text-xs"></i> Priority Support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p class="text-gray-700 text-sm mb-2">
                  <strong>To Upgrade your subscription,</strong> please contact: <a href="mailto:ambassadors@t4leader.com" class="text-[#4b0d7f] font-semibold hover:underline">ambassadors@t4leader.com</a>
                </p>
              </div>
            </div>
            
            <div class="flex justify-center">
              <button onclick="window.subscriptionManager.closeUpgradeModal()" 
                      class="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('subscriptionModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  closeUpgradeModal() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => modal.remove(), 200);
    }
  }

  contactSupport() {
    // Close modal first
    this.closeUpgradeModal();
    
    // Simple email details
    const subject = 'Subscription Upgrade Request';
    const body = `Hello T4L Team,

I am interested in upgrading my subscription from Free to Paid to access all features.

Current Subscription: Free
Requested Subscription: Paid

Please let me know the next steps to proceed with the upgrade.

Thank you,
[Your Name]`;
    
    // Create mailto link - simple and direct
    const mailtoLink = `mailto:ambassadors@t4leader.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open email client directly
    window.location.href = mailtoLink;
  }

  async initialize() {
    this.addStyles();
    // Show skeleton in sidebar so free users don't see full nav during latency and click restricted items
    this.showSidebarSkeleton();
    await this.checkSubscription();
    this.hideSidebarSkeletonShowNav();
    this.restrictNavigation();
    this.addSubscriptionBadge();
  }

  addSubscriptionBadge() {
    // Add subscription badge to dashboard
    const badge = document.createElement('div');
    badge.className = 'subscription-badge';
    badge.innerHTML = `
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
        this.hasFullAccess 
          ? 'text-white' 
          : 'bg-purple-100 text-[#4b0d7f]'
      }" ${this.hasFullAccess ? 'style="background: linear-gradient(to right, #4b0d7f, #a36737);"' : ''}>
        <i class="fas ${this.hasFullAccess ? 'fa-crown' : 'fa-user'}"></i>
        ${this.hasFullAccess ? 'Paid' : 'Free Subscription'}
      </div>
    `;
    
    // Add to header or profile section
    const header = document.querySelector('nav .flex.items-center') || 
                   document.querySelector('header') ||
                   document.querySelector('.dashboard-header');
    if (header) {
      header.appendChild(badge);
    }
  }

  addStyles() {
    // Add CSS for animations if not already present
    if (document.getElementById('subscription-manager-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'subscription-manager-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .lock-icon {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Sidebar loading state: hide icon, show spinner, block clicks */
      .sidebar a.subscription-loading {
        position: relative;
        pointer-events: none;
        opacity: 0.6;
      }
      
      .sidebar a.subscription-loading i.bx,
      .sidebar a.subscription-loading .bx {
        opacity: 0;
      }
      
      .sidebar a.subscription-loading::after {
        content: '';
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        border: 2px solid #4b0d7f;
        border-top-color: transparent;
        animation: spin-subscription-loader 0.6s linear infinite;
      }
      
      @keyframes spin-subscription-loader {
        from { transform: translateX(-50%) rotate(0deg); }
        to   { transform: translateX(-50%) rotate(360deg); }
      }

      /* Sidebar skeleton loader (for free ambassadors during subscription check) */
      .sidebar-skeleton-icon,
      .sidebar-skeleton-text {
        animation: subscription-skeleton-pulse 1.5s ease-in-out infinite;
      }
      @keyframes subscription-skeleton-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================
// USAGE: Initialize on page load
// ============================================

// Initialize subscription manager
const subscriptionManager = new SubscriptionManager();

// Make it globally accessible for onclick handlers
window.subscriptionManager = subscriptionManager;

// Check subscription on page load
document.addEventListener('DOMContentLoaded', async () => {
  await subscriptionManager.initialize();
});
