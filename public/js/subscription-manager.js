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
          lockIcon.style.cssText = 'margin-left: 8px; font-size: 12px; color: #f59e0b;';
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
          <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-500 to-orange-600">
            <div class="flex items-center gap-3">
              <i class="fas fa-crown text-white text-3xl"></i>
              <div>
                <h3 class="text-2xl font-bold text-white">Upgrade Required</h3>
                <p class="text-amber-100 text-sm">Unlock this feature with a paid subscription</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="mb-6">
              <div class="flex items-start gap-3 mb-4">
                <i class="fas fa-info-circle text-blue-500 text-xl mt-0.5"></i>
                <div>
                  <p class="text-gray-700 mb-2">
                    You're currently on a <strong>Free</strong> subscription which includes:
                  </p>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>✅ Access to Events</li>
                    <li>✅ Partner Opportunities</li>
                    <li>✅ Impact Log</li>
                    <li>✅ Chat & Communication</li>
                  </ul>
                </div>
              </div>
              
              <div class="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                <div class="flex items-start gap-3">
                  <i class="fas fa-star text-amber-500 text-xl mt-0.5"></i>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-2">Upgrade to Paid for Full Access:</h4>
                    <ul class="text-sm text-gray-700 space-y-1">
                      <li>🚀 Journey Progress Tracking</li>
                      <li>📝 Article Publishing</li>
                      <li>👤 Advanced Profile Features</li>
                      <li>🔧 Professional Services</li>
                      <li>📊 Analytics & Insights</li>
                      <li>🎯 Priority Support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex gap-3">
              <button onclick="subscriptionManager.closeUpgradeModal()" 
                      class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all">
                Maybe Later
              </button>
              <button onclick="subscriptionManager.contactSupport()" 
                      class="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl">
                <i class="fas fa-envelope mr-2"></i>
                Contact Support
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
    // Redirect to support or show contact form
    // You can customize this to your support page
    window.location.href = '/contact-support.html';
    // Or open email client
    // window.location.href = 'mailto:support@t4leader.com?subject=Subscription Upgrade Request';
  }

  async initialize() {
    await this.checkSubscription();
    this.restrictNavigation();
    this.addSubscriptionBadge();
    this.addStyles();
  }

  addSubscriptionBadge() {
    // Add subscription badge to dashboard
    const badge = document.createElement('div');
    badge.className = 'subscription-badge';
    badge.innerHTML = `
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
        this.hasFullAccess 
          ? 'bg-green-100 text-green-700' 
          : 'bg-blue-100 text-blue-700'
      }">
        <i class="fas ${this.hasFullAccess ? 'fa-crown' : 'fa-user'}"></i>
        ${this.hasFullAccess ? 'Paid' : 'Free'} Subscription
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
    `;
    document.head.appendChild(style);
  }
}

// ============================================
// USAGE: Initialize on page load
// ============================================

// Initialize subscription manager
const subscriptionManager = new SubscriptionManager();

// Check subscription on page load
document.addEventListener('DOMContentLoaded', async () => {
  await subscriptionManager.initialize();
});
