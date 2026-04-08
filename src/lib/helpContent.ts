/**
 * Help content for every page in the CRM.
 * Each key maps to a route path and contains an array of slides.
 * Used by PageHelpGuide to render contextual tutorials and Knowledge Hub for text content.
 */

export const helpContent: Record<string, any> = {
  /* ══════════════════════════════════════════════
     CORE
     ══════════════════════════════════════════════ */
  '/': {
    title: 'Dashboard',
    slides: [
      {
        title: 'Your Dashboard',
        subtitle: 'The central hub for everything happening across Isobex Lasers.',
        description: 'The Dashboard shows you a real-time overview of your metrics — from recent orders and pipeline progress to customer engagement.',
        icon: 'LayoutDashboard',
        iconColor: 'var(--color-primary)',
      },
      {
        title: 'Key Metrics',
        subtitle: 'What the snapshot numbers mean.',
        features: [
          { icon: 'Target', label: 'Pipeline Pipeline', desc: 'Total value of deals tracking currently', color: 'var(--color-primary)' },
          { icon: 'ShoppingBag', label: 'Recent Orders', desc: 'Overview of latest e-commerce sales', color: 'var(--color-info)' },
          { icon: 'Users', label: 'Contacts', desc: 'Number of people in your database', color: 'var(--color-success)' },
        ],
      },
    ],
  },
  '/crm': {
    title: 'Contacts',
    slides: [
      {
        title: 'Contacts Directory',
        subtitle: 'Manage all the individuals you do business with.',
        description: 'Keep track of customer details, communication history, linked companies, and order history.',
        icon: 'Users',
        iconColor: 'var(--color-info)',
      },
      {
        title: 'Key Actions',
        subtitle: 'What you can do here.',
        features: [
          { icon: 'Settings', label: 'Add Contact', desc: 'Create a new person and optionally link them to a company.', color: 'var(--color-success)' },
          { icon: 'Building2', label: 'View Linked Company', desc: 'Navigate directly to a contacts workplace.', color: 'var(--color-primary)' },
          { icon: 'PackageCheck', label: 'Purchase History', desc: 'View what this person has bought.', color: 'var(--color-info)' },
        ],
      },
    ],
  },
  '/companies': {
    title: 'Companies',
    slides: [
      {
        title: 'Companies Directory',
        subtitle: 'Track organisations and businesses.',
        description: 'Companies group multiple contacts together. You can see aggregated orders, pipeline deals, and overarching communication.',
        icon: 'Building2',
        iconColor: 'var(--color-primary)',
      },
      {
        title: 'Key Insights',
        subtitle: 'Why use companies?',
        features: [
          { icon: 'Users', label: 'Associated Contacts', desc: 'See everyone who works at the organization.', color: 'var(--color-info)' },
          { icon: 'Target', label: 'Deals & Pipeline', desc: 'Track ongoing sales specific to this company.', color: 'var(--color-warning)' },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════════
     SALES & COMMERCE
     ══════════════════════════════════════════════ */
  '/pipeline': {
    title: 'Pipeline',
    slides: [
      {
        title: 'Sales Pipeline',
        subtitle: 'Track B2B deals from enquiry to won.',
        description: 'Your Kanban board for tracking ongoing sales and negotiations. Move deals across stages as they progress towards closing.',
        icon: 'Target',
        iconColor: 'var(--color-warning)',
      },
      {
        title: 'Pipeline Stages',
        subtitle: 'How a deal progresses.',
        features: [
          { icon: 'Map', label: 'Lead/Enquiry', desc: 'New potential deals that need qualification.', color: 'var(--color-info)' },
          { icon: 'MonitorPlay', label: 'Negotiation', desc: 'Active communication and pricing discussion.', color: 'var(--color-primary)' },
          { icon: 'Sparkles', label: 'Closed Won', desc: 'Deal finalized successfully!', color: 'var(--color-success)' },
        ],
      },
    ],
  },
  '/store': {
    title: 'Online Store',
    slides: [
      {
        title: 'E-Commerce Management',
        subtitle: 'Manage your entire shopfront.',
        description: 'Add or edit products, organize them into collections, and track inventory levels across your catalogue.',
        icon: 'ShoppingBag',
        iconColor: 'var(--color-success)',
      },
      {
        title: 'Store Features',
        subtitle: 'What you can control.',
        features: [
          { icon: 'Settings', label: 'Product Builder', desc: 'Create vivid product pages with images, pricing, and variants.', color: 'var(--color-primary)' },
          { icon: 'FolderOpen', label: 'Collections', desc: 'Group items together (e.g., Summer Sale, Industrial Lazers).', color: 'var(--color-info)' },
          { icon: 'BarChart3', label: 'Inventory Management', desc: 'Keep track of stock levels automatically.', color: 'var(--color-warning)' },
        ],
      },
    ],
  },
  '/orders': {
    title: 'Orders',
    slides: [
      {
        title: 'Order Tracking',
        subtitle: 'Fulfill customer purchases.',
        description: 'View all purchases made through the online store. Track payment status, update shipping details, and communicate dispatch.',
        icon: 'PackageCheck',
        iconColor: 'var(--color-info)',
      },
      {
        title: 'Fulfillment Steps',
        subtitle: 'Managing an order lifecycle.',
        features: [
          { icon: 'Rocket', label: 'Unfulfilled', desc: 'New orders waiting to be packed.', color: 'var(--color-warning)' },
          { icon: 'Sparkles', label: 'Fulfilled', desc: 'Order dispatched to the customer.', color: 'var(--color-success)' },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════════
     MARKETING
     ══════════════════════════════════════════════ */
  '/email-marketing': {
    title: 'Email Marketing',
    slides: [
      {
        title: 'Campaigns',
        subtitle: 'Engage with your database.',
        description: 'Create beautiful email newsletters, product announcements, and promotional blasts. Use the visual builder to craft your message.',
        icon: 'Mail',
        iconColor: 'var(--color-primary)',
      },
      {
        title: 'Email Features',
        subtitle: 'What makes a great campaign.',
        features: [
          { icon: 'Settings', label: 'Visual Builder', desc: 'Drag-and-drop components without coding.', color: 'var(--color-info)' },
          { icon: 'Users', label: 'Audience Selection', desc: 'Filter who receives your email (e.g., all contacts, past buyers).', color: 'var(--color-success)' },
        ],
      },
    ],
  },
  '/reviews': {
    title: 'Reviews',
    slides: [
      {
        title: 'Customer Feedback',
        subtitle: 'Manage testimonials and ratings.',
        description: 'Collect, review, and publish customer feedback. Positive reviews build trust on your storefront.',
        icon: 'Star',
        iconColor: 'var(--color-warning)',
      },
    ],
  },

  /* ══════════════════════════════════════════════
     OPERATIONS
     ══════════════════════════════════════════════ */
  '/documents': {
    title: 'Documents',
    slides: [
      {
        title: 'File Storage',
        subtitle: 'Centralised media library.',
        description: 'Upload product manuals, specification sheets, marketing assets, and invoice templates for easy access.',
        icon: 'FileText',
        iconColor: 'var(--color-info)',
      },
    ],
  },
  '/reporting': {
    title: 'Reporting',
    slides: [
      {
        title: 'Analytics & Reports',
        subtitle: 'Understand your business performance.',
        description: 'Detailed breakdowns of revenue, best-selling products, sales team performance, and email campaign success.',
        icon: 'BarChart3',
        iconColor: 'var(--color-success)',
      },
    ],
  },
  '/settings': {
    title: 'Settings',
    slides: [
      {
        title: 'System Preferences',
        subtitle: 'Configure your CRM.',
        description: 'Manage staff accounts, adjust store policies, update your domain, and set organization-wide preferences.',
        icon: 'Settings',
        iconColor: 'var(--color-primary)',
      },
      {
        title: 'Key Settings',
        subtitle: 'What you can adjust.',
        features: [
          { icon: 'Users', label: 'Staff Management', desc: 'Invite new team members and assign permissions.', color: 'var(--color-info)' },
          { icon: 'Target', label: 'Company Profile', desc: 'Update your localized business details.', color: 'var(--color-success)' },
          { icon: 'Rocket', label: 'Integrations', desc: 'Connect payment gateways and email providers.', color: 'var(--color-warning)' },
        ],
      },
    ],
  },

  /* ══════════════════════════════════════════════
     DYNAMIC ROUTES (Fallback mapping)
     ══════════════════════════════════════════════ */
  '/crm/:id': {
    title: 'Contact Profile',
    fallback: '/crm',
    slides: null,
  },
  '/store/:id': {
    title: 'Product Details',
    fallback: '/store',
    slides: null,
  },
};

/**
 * Get help content for a given route path.
 * Handles dynamic routes like /crm/:id
 */
export function getHelpForRoute(pathname: string) {
  // Direct match
  if (helpContent[pathname]) {
    const entry = helpContent[pathname];
    // Handle fallback
    if (entry.fallback && !entry.slides) {
      return helpContent[entry.fallback] || null;
    }
    return entry;
  }

  // Dynamic route matching
  if (pathname.match(/^\/crm\/.+/)) return helpContent['/crm'];
  if (pathname.match(/^\/companies\/.+/)) return helpContent['/companies'];
  if (pathname.match(/^\/orders\/.+/)) return helpContent['/orders'];
  if (pathname.match(/^\/store\/.+/)) return helpContent['/store'];
  if (pathname.match(/^\/email-marketing\/.+/)) return helpContent['/email-marketing'];
  
  return null;
}
