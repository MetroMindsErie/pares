/**
 * RBAC Feature Reference
 * 
 * Quick reference for all features, their requirements, and usage limits.
 * Format: ✅ = Available, ⏳ = Coming Soon, ❌ = Not Available
 */

// ==============================================
// FEATURE MATRIX QUICK REFERENCE
// ==============================================

const FEATURES_REFERENCE = {
  // ==================== LISTING FEATURES ====================
  
  'list:properties': {
    name: 'List Properties',
    category: 'core',
    description: 'Ability to create and list properties on the platform',
    access: {
      public: false,
      basic_user: { free: false, professional: false, premium: false },
      professional_user: {
        free: false,
        professional: true,  // ✅ Max 5 listings
        premium: true,       // ✅ Unlimited listings
      },
      super_admin: true,     // ✅
    },
    limits: {
      professional: 5,
      premium: -1, // unlimited
    },
    notes: 'Requires professional_user role. Free tier users cannot list.',
    upsellTarget: 'professional',
  },

  'manage:listings': {
    name: 'Manage Listings',
    category: 'core',
    description: 'Edit, delete, and manage existing property listings',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅
        premium: true,       // ✅
      },
      super_admin: true,     // ✅
    },
    limits: {
      professional: 5,
      premium: -1, // unlimited
    },
    notes: 'Can only manage own listings unless broker/admin',
    upsellTarget: 'professional',
  },

  'unpublish:listings': {
    name: 'Unpublish Listings',
    category: 'core',
    description: 'Hide listings from public view without deletion',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅
        premium: true,       // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Listings can be republished later',
    upsellTarget: 'professional',
  },

  // ==================== ANALYTICS & REPORTING ====================

  'view:analytics': {
    name: 'View Analytics',
    category: 'analytics',
    description: 'See basic analytics for property views and inquiries',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅ Basic analytics
        premium: true,       // ✅ Advanced analytics
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Professional tier shows basic views/inquiries. Premium shows detailed breakdown.',
    upsellTarget: 'professional',
  },

  'advanced:analytics': {
    name: 'Advanced Analytics',
    category: 'analytics',
    description: 'Detailed analytics including visitor demographics and engagement metrics',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Includes visitor heatmaps, time-based analytics, and conversion tracking',
    upsellTarget: 'premium',
  },

  'export:analytics': {
    name: 'Export Analytics',
    category: 'analytics',
    description: 'Download analytics reports as PDF or CSV',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Premium feature only',
    upsellTarget: 'premium',
  },

  // ==================== CONTACT & COMMUNICATION ====================

  'manage:contacts': {
    name: 'Manage Contacts',
    category: 'contacts',
    description: 'Create and manage contact lists and leads',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅ Max 100 contacts
        premium: true,       // ✅ Unlimited
      },
      super_admin: true,
    },
    limits: {
      professional: 100,
      premium: -1,
    },
    notes: 'Contacts are stored per user/agent',
    upsellTarget: 'professional',
  },

  'export:contacts': {
    name: 'Export Contacts',
    category: 'contacts',
    description: 'Export contacts to CSV or integrate with CRM',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Premium feature. CSV export and CRM sync available.',
    upsellTarget: 'premium',
  },

  'messaging:clients': {
    name: 'Client Messaging',
    category: 'communication',
    description: 'Send direct messages to clients and leads',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅
        premium: true,       // ✅
      },
      super_admin: true,
    },
    limits: {
      professional: 50, // messages per day
      premium: -1,      // unlimited
    },
    notes: 'Messaging between agents and prospects',
    upsellTarget: 'professional',
  },

  // ==================== MEDIA & CONTENT ====================

  'multi:media': {
    name: 'Multiple Media Types',
    category: 'media',
    description: 'Upload photos, videos, floor plans, and documents',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅ Max 50 photos, 1 video
        premium: true,       // ✅ Unlimited media
      },
      super_admin: true,
    },
    limits: {
      professional: { photos: 50, videos: 1, floorPlans: 2 },
      premium: { photos: -1, videos: -1, floorPlans: -1 },
    },
    notes: 'All media types combined count toward storage limits',
    upsellTarget: 'professional',
  },

  'virtual:staging': {
    name: 'Virtual Staging',
    category: 'media',
    description: 'AI-powered furniture staging for property photos',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: {
      premium: 20, // staged photos per month
    },
    notes: 'Premium feature. Powered by AI image generation.',
    upsellTarget: 'premium',
  },

  'interactive:map': {
    name: 'Interactive Property Map',
    category: 'media',
    description: 'Interactive map with property details and nearby amenities',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅ Basic map
        premium: true,       // ✅ Advanced features
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Available in all property listings. Premium adds investment analytics overlay.',
    upsellTarget: 'professional',
  },

  // ==================== PROFESSIONAL FEATURES ====================

  'manage:agents': {
    name: 'Manage Agents',
    category: 'professional',
    description: 'Create and manage agent accounts (Broker only)',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: { broker: true, agent: false, investor: false, realtor_partner: false },  // ✅ Max 3
        premium: { broker: true, agent: false, investor: false, realtor_partner: false },      // ✅ Unlimited
      },
      super_admin: true,
    },
    limits: {
      professional_broker: 3,
      premium_broker: -1,
    },
    notes: 'Broker-only feature. Cannot be used by agents.',
    upsellTarget: 'professional',
    requiredProfessionalType: 'broker',
  },

  'company:branding': {
    name: 'Company Branding',
    category: 'professional',
    description: 'Upload company logo, colors, and branding (Broker only)',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: { broker: false, agent: false, investor: false, realtor_partner: false },
        premium: { broker: true, agent: false, investor: false, realtor_partner: false },  // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Premium feature for brokers only. Logo, color scheme, and custom domain.',
    upsellTarget: 'premium',
    requiredProfessionalType: 'broker',
  },

  'portfolio:management': {
    name: 'Portfolio Management',
    category: 'professional',
    description: 'Track and manage investment portfolio (Investor only)',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: { investor: true, agent: false, broker: false, realtor_partner: false },  // ✅ Basic
        premium: { investor: true, agent: false, broker: false, realtor_partner: false },      // ✅ Advanced
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Investor-only feature. Track properties, ROI, and investments.',
    upsellTarget: 'professional',
    requiredProfessionalType: 'investor',
  },

  // ==================== API & INTEGRATIONS ====================

  'api:access': {
    name: 'API Access',
    category: 'integrations',
    description: 'Access to REST API for third-party integrations',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: {
      premium: 1000, // API calls per day
    },
    notes: 'Premium feature. 1000 requests per day included.',
    upsellTarget: 'premium',
  },

  'webhook:integration': {
    name: 'Webhook Integration',
    category: 'integrations',
    description: 'Setup webhooks for CRM, email, and automation',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Premium feature. Integrations with Zapier, Make, and custom webhooks.',
    upsellTarget: 'premium',
  },

  // ==================== AI FEATURES ====================

  'ai:assistant': {
    name: 'AI Assistant',
    category: 'ai',
    description: 'AI-powered property descriptions, market analysis, and suggestions',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅ 100 requests/month
        premium: true,       // ✅ Unlimited
      },
      super_admin: true,
    },
    limits: {
      professional: 100, // per month
      premium: -1,       // unlimited
    },
    notes: 'Uses GPT-4 for intelligent suggestions',
    upsellTarget: 'professional',
  },

  'ai:suggestions': {
    name: 'AI Suggestions',
    category: 'ai',
    description: 'Get AI suggestions for pricing, improvements, and marketing',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅
        premium: true,       // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'Included with AI Assistant feature',
    upsellTarget: 'professional',
  },

  // ==================== MARKETING FEATURES ====================

  'social:sharing': {
    name: 'Social Media Sharing',
    category: 'marketing',
    description: 'Share listings on Facebook, Instagram, and LinkedIn',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: true,  // ✅
        premium: true,       // ✅
      },
      super_admin: true,
    },
    limits: null,
    notes: 'One-click sharing with auto-generated posts',
    upsellTarget: 'professional',
  },

  'video:marketing': {
    name: 'Video Marketing Tools',
    category: 'marketing',
    description: 'Create property video promos and reels',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: {
      premium: 50, // videos per month
    },
    notes: 'Premium feature. Auto-generated video tours and marketing reels.',
    upsellTarget: 'premium',
  },

  'email:campaigns': {
    name: 'Email Marketing Campaigns',
    category: 'marketing',
    description: 'Send targeted email campaigns to leads and clients',
    access: {
      public: false,
      basic_user: false,
      professional_user: {
        free: false,
        professional: false,
        premium: true,  // ✅
      },
      super_admin: true,
    },
    limits: {
      premium: 5000, // emails per month
    },
    notes: 'Premium feature. Templates, scheduling, and analytics included.',
    upsellTarget: 'premium',
  },

  // ==================== ADMIN FEATURES ====================

  'admin:dashboard': {
    name: 'Admin Dashboard',
    category: 'admin',
    description: 'Access to admin panel and system controls',
    access: {
      public: false,
      basic_user: false,
      professional_user: false,
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Super admin only',
    requiredRole: 'super_admin',
  },

  'manage:users': {
    name: 'Manage Users',
    category: 'admin',
    description: 'Create, edit, and delete user accounts',
    access: {
      public: false,
      basic_user: false,
      professional_user: false,
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Super admin only',
    requiredRole: 'super_admin',
  },

  'manage:subscriptions': {
    name: 'Manage Subscriptions',
    category: 'admin',
    description: 'View and manage user subscriptions and billing',
    access: {
      public: false,
      basic_user: false,
      professional_user: false,
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Super admin only',
    requiredRole: 'super_admin',
  },

  'verify:professionals': {
    name: 'Verify Professionals',
    category: 'admin',
    description: 'Approve and verify professional agents, brokers, and investors',
    access: {
      public: false,
      basic_user: false,
      professional_user: false,
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Super admin only. Marks agents/brokers as verified.',
    requiredRole: 'super_admin',
  },

  // ==================== PUBLIC FEATURES ====================

  'view:property': {
    name: 'View Property Details',
    category: 'public',
    description: 'View detailed property listings',
    access: {
      public: true,       // ✅
      basic_user: true,   // ✅
      professional_user: true,  // ✅
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Always available to all users',
  },

  'public:agent:directory': {
    name: 'Agent Directory',
    category: 'public',
    description: 'Browse and contact licensed agents',
    access: {
      public: true,       // ✅
      basic_user: true,   // ✅
      professional_user: true,  // ✅
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Always available. Shows only verified agents.',
  },

  'public:agent:profile': {
    name: 'Agent Public Profile',
    category: 'public',
    description: 'Public profile page with agent details and listings',
    access: {
      public: true,       // ✅
      basic_user: true,   // ✅
      professional_user: true,  // ✅
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Accessible to all users. Shows when agent has public profile enabled.',
  },

  'view:blog': {
    name: 'View Blog',
    category: 'public',
    description: 'Read real estate blog articles and market insights',
    access: {
      public: true,       // ✅
      basic_user: true,   // ✅
      professional_user: true,  // ✅
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Always available',
  },

  'partner:content': {
    name: 'Partner Content (BiggerPockets)',
    category: 'public',
    description: 'Access to investor content from BiggerPockets',
    access: {
      public: true,       // ✅
      basic_user: true,   // ✅
      professional_user: true,  // ✅
      super_admin: true,  // ✅
    },
    limits: null,
    notes: 'Always available. Embedded partner content.',
  },
};

// ==============================================
// SUBSCRIPTION TIER COMPARISON
// ==============================================

const SUBSCRIPTION_TIERS_COMPARISON = {
  free: {
    price: '$0',
    period: 'Forever',
    features: [
      'View properties',
      'Search listings',
      'Contact agents',
      'Save properties',
    ],
    featureCount: 4,
    targetAudience: 'Home buyers and investors',
  },
  professional: {
    price: '$29',
    period: '/month',
    features: [
      'Everything in Free',
      'List up to 5 properties',
      'Basic analytics',
      'Manage contacts (100 max)',
      'Client messaging',
      'AI assistant (100/month)',
      'Social media sharing',
      // Professional-specific features based on type
      '3 agent management (Brokers)',
      'Investment tracking (Investors)',
    ],
    featureCount: 10,
    targetAudience: 'Agents, Small brokers, Investors',
  },
  premium: {
    price: '$99',
    period: '/month',
    features: [
      'Everything in Professional',
      'Unlimited listings',
      'Advanced analytics',
      'Unlimited contacts',
      'Unlimited messaging',
      'AI assistant (unlimited)',
      'Virtual staging (20/month)',
      'Video marketing tools',
      'Email campaigns (5000/month)',
      'API access',
      'Webhook integration',
      'Advanced company branding (Brokers)',
      'Unlimited agent management (Brokers)',
      'Advanced portfolio tools (Investors)',
      'Custom domain',
    ],
    featureCount: 15,
    targetAudience: 'Large brokerages, Power investors, Teams',
  },
};

// ==============================================
// PROFESSIONAL TYPE BREAKDOWN
// ==============================================

const PROFESSIONAL_TYPES_BREAKDOWN = {
  agent: {
    name: 'Real Estate Agent',
    description: 'List and sell properties, manage clients',
    features: [
      'list:properties',
      'manage:listings',
      'view:analytics',
      'manage:contacts',
      'messaging:clients',
      'multi:media',
      'ai:assistant',
      'social:sharing',
    ],
    restrictions: [
      'Cannot: manage agents (broker only)',
      'Cannot: manage company branding (broker only)',
      'Cannot: portfolio management (investor only)',
    ],
    upgradePathToPremium: true,
    bestFor: 'Individual real estate agents selling properties',
  },

  broker: {
    name: 'Broker',
    description: 'Manage agents, company branding, and properties',
    features: [
      'list:properties',
      'manage:listings',
      'view:analytics',
      'manage:contacts',
      'messaging:clients',
      'multi:media',
      'ai:assistant',
      'social:sharing',
      'manage:agents',
      'company:branding', // Premium only
    ],
    restrictions: [
      'Cannot: portfolio management (investor only)',
    ],
    upgradePathToPremium: true,
    bestFor: 'Real estate brokerages and teams managing multiple agents',
  },

  investor: {
    name: 'Investor',
    description: 'Manage investment portfolio and analyze deals',
    features: [
      'list:properties',
      'manage:listings',
      'view:analytics',
      'portfolio:management',
      'ai:assistant',
      'social:sharing',
    ],
    restrictions: [
      'Cannot: manage agents (broker only)',
      'Cannot: company branding (broker only)',
    ],
    upgradePathToPremium: true,
    bestFor: 'Real estate investors analyzing and managing investment properties',
  },

  realtor_partner: {
    name: 'Realtor Partner',
    description: 'Partner access with limited features',
    features: [
      'view:property',
      'public:agent:directory',
      'view:blog',
    ],
    restrictions: [
      'Cannot: list properties (requires professional)',
      'Cannot: view analytics',
      'Cannot: manage contacts',
    ],
    upgradePathToPremium: false,
    bestFor: 'Partner organizations and limited access users',
  },
};

export {
  FEATURES_REFERENCE,
  SUBSCRIPTION_TIERS_COMPARISON,
  PROFESSIONAL_TYPES_BREAKDOWN,
};
