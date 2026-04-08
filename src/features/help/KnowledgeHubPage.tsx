import { useState, useMemo } from 'react';
import { Search, ChevronDown, Flag, Sparkles, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './KnowledgeHubPage.css';

interface ArticleStep {
  text: string;
}

interface Article {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  steps: ArticleStep[];
  tip?: string;
  linkRoute?: string;
}

interface Section {
  title: string;
  articles: Article[];
}

const knowledgeData: Section[] = [
  {
    title: 'Core & Basics',
    articles: [
      {
        id: 'navigating-dashboard',
        title: 'Navigating the Dashboard',
        subtitle: 'Understand your main overview metrics.',
        description: 'The dashboard is the first thing you see. It provides an immediate overview of your pipeline, latest orders, and contact statistics.',
        steps: [
          { text: 'Log in to the CRM to view your Dashboard.' },
          { text: 'Look at the top stat cards to see total pipeline value, recent orders, and total contacts.' },
          { text: 'Scroll down to see the latest activity and quick links.' },
        ],
        tip: 'Click on any statistic card to jump directly to that section of the CRM.',
        linkRoute: '/',
      },
      {
        id: 'managing-contacts',
        title: 'Managing Contacts',
        subtitle: 'Add, edit, and organize individuals.',
        description: 'Contacts represent the people you do business with. Maintaining up-to-date contact records is vital for successful ongoing communication.',
        steps: [
          { text: 'Click "Contacts" in the left sidebar.' },
          { text: 'To add a new person, click the "Add Contact" button in the top right.' },
          { text: 'Fill in their name, email, phone number, and any other relevant details.' },
          { text: 'To view or edit an existing contact, click on their name in the table.' },
        ],
        tip: 'You can link a contact directly to a Company from their profile page.',
        linkRoute: '/crm',
      },
      {
        id: 'managing-companies',
        title: 'Managing Companies',
        subtitle: 'Group contacts into organizations.',
        description: 'Companies allow you to see a holistic view of all contacts, orders, and deals associated with a single business entity.',
        steps: [
          { text: 'Click "Companies" in the left sidebar.' },
          { text: 'Click "Add Company" to create a new organization record.' },
          { text: 'Enter the company name, industry, and main contact details.' },
          { text: 'Open a company profile to see all associated contacts and deals.' },
        ],
        linkRoute: '/companies',
      },
    ],
  },
  {
    title: 'Sales & Pipeline',
    articles: [
      {
        id: 'using-pipeline',
        title: 'Using the Sales Pipeline',
        subtitle: 'Track deals from enquiry to closed-won.',
        description: 'The pipeline is a visual Kanban board that helps you track active sales opportunities and monitor their progress.',
        steps: [
          { text: 'Navigate to "Pipeline" from the sidebar.' },
          { text: 'Click "Add Deal" to create a new opportunity.' },
          { text: 'Fill in the deal name, value, and associated company.' },
          { text: 'Drag and drop the deal card between columns (Lead, Negotiation, Won) as it progresses.' },
        ],
        tip: 'Keep your pipeline updated weekly to ensure accurate revenue forecasting.',
        linkRoute: '/pipeline',
      },
    ],
  },
  {
    title: 'E-Commerce & Orders',
    articles: [
      {
        id: 'online-store',
        title: 'Managing the Online Store',
        subtitle: 'Add products and manage collections.',
        description: 'Your online store catalogue is fully managed from within the CRM. Any changes here reflect instantly on your public shopfront.',
        steps: [
          { text: 'Click "Online Store" in the sidebar.' },
          { text: 'To add a new product, click "Add Product" and fill in the title, description, and pricing.' },
          { text: 'Upload high-quality images in the media section.' },
          { text: 'Assign the product to a "Collection" to group similar items together.' },
        ],
        linkRoute: '/store',
      },
      {
        id: 'fulfilling-orders',
        title: 'Fulfilling Orders',
        subtitle: 'Process and dispatch customer purchases.',
        description: 'When a customer checks out on your store, the order appears here for processing and fulfillment.',
        steps: [
          { text: 'Click "Orders" in the sidebar.' },
          { text: 'Identify orders marked as "Unfulfilled".' },
          { text: 'Click on the order ID to view the items purchased and the shipping address.' },
          { text: 'Once packed and dispatched, update the order status to "Fulfilled".' },
        ],
        tip: 'Customers automatically receive an email notification when their order is marked as fulfilled.',
        linkRoute: '/orders',
      },
    ],
  },
  {
    title: 'Marketing & Operations',
    articles: [
      {
        id: 'email-campaigns',
        title: 'Sending Email Campaigns',
        subtitle: 'Reach your audience with visual emails.',
        description: 'Create and send promotional emails or newsletters to your contacts using the integrated email builder.',
        steps: [
          { text: 'Navigate to "Email Marketing".' },
          { text: 'Click "Create Campaign" and give it a descriptive name.' },
          { text: 'Use the visual drag-and-drop builder to add images, text, and buttons to your email.' },
          { text: 'Select your target audience and click "Send".' },
        ],
        linkRoute: '/email-marketing',
      },
      {
        id: 'reporting',
        title: 'Viewing Reports',
        subtitle: 'Analyze your business performance.',
        description: 'Reports provide a deep dive into your sales, pipeline velocity, and store revenue.',
        steps: [
          { text: 'Click "Reporting" in the sidebar.' },
          { text: 'Select the date range you want to analyze at the top of the page.' },
          { text: 'Review the charts for revenue trends and top-selling products.' },
        ],
        linkRoute: '/reporting',
      },
    ],
  },
];

export function KnowledgeHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filter sections based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return knowledgeData;
    
    const query = searchQuery.toLowerCase();
    
    return knowledgeData.map(section => {
      const filteredArticles = section.articles.filter(
        article => 
          article.title.toLowerCase().includes(query) || 
          article.description.toLowerCase().includes(query) ||
          article.steps.some(step => step.text.toLowerCase().includes(query))
      );
      return { ...section, articles: filteredArticles };
    }).filter(section => section.articles.length > 0);
  }, [searchQuery]);

  const toggleArticle = (id: string) => {
    setExpandedArticleId(prev => prev === id ? null : id);
  };

  const hasResults = filteredData.length > 0;

  return (
    <div className="knowledge-hub">
      <div className="knowledge-hub-header">
        <h1 className="knowledge-hub-title">Knowledge Hub</h1>
        <p className="knowledge-hub-subtitle">
          In-depth guides and instructions for using the Isobex Lasers CRM.
        </p>
        
        <div className="knowledge-search">
          <Search className="knowledge-search-icon" size={20} />
          <input
            type="text"
            className="knowledge-search-input"
            placeholder="Search for guides (e.g., 'add product', 'pipeline')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="knowledge-layout">
        {/* Main Content */}
        <div className="knowledge-content">
          {!hasResults && (
            <div className="knowledge-empty">
              <Search size={48} style={{ margin: '0 auto', opacity: 0.2 }} />
              <p>No guides found matching "{searchQuery}"</p>
            </div>
          )}

          {filteredData.map((section, idx) => (
            <div key={idx} className="knowledge-section">
              <h2 className="knowledge-section-title">
                {section.title}
              </h2>
              
              <div className="knowledge-articles">
                {section.articles.map(article => {
                  const isExpanded = expandedArticleId === article.id;
                  
                  return (
                    <div 
                      key={article.id} 
                      className={`knowledge-article ${isExpanded ? 'expanded' : ''}`}
                    >
                      <button 
                        className="knowledge-article-header"
                        onClick={() => toggleArticle(article.id)}
                      >
                        <div className="knowledge-article-title">
                          <h3>{article.title}</h3>
                          <span>{article.subtitle}</span>
                        </div>
                        <ChevronDown className="knowledge-article-chevron" size={20} />
                      </button>
                      
                      {isExpanded && (
                        <div className="knowledge-article-body">
                          <p style={{ paddingTop: 'var(--space-4)' }}>{article.description}</p>
                          
                          <div style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                            {article.steps.map((step, sIdx) => (
                              <div key={sIdx} className="knowledge-step">
                                <div className="knowledge-step-number">{sIdx + 1}</div>
                                <div className="knowledge-step-text">{step.text}</div>
                              </div>
                            ))}
                          </div>
                          
                          {article.tip && (
                            <div className="knowledge-callout">
                              <strong>Pro Tip:</strong> {article.tip}
                            </div>
                          )}
                          
                          {article.linkRoute && (
                            <div className="knowledge-action">
                              <button 
                                className="btn-secondary" 
                                onClick={() => navigate(article.linkRoute!)}
                              >
                                <MonitorPlay size={16} />
                                Go to {article.title.replace('Navigating the ', '').replace('Managing ', '').replace('Using the ', '')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Tips Sidebar */}
        <div className="knowledge-sidebar">
          <div className="knowledge-widget">
            <h4><Sparkles size={18} /> Quick Tips</h4>
            <div className="knowledge-widget-list">
              <div className="knowledge-widget-item">
                <Flag size={16} className="knowledge-widget-icon" style={{ color: 'var(--color-primary)' }} />
                <div>
                  Interactive Tutorials
                  <span>Click the "?" icon in the top right of any page to get a slide-based tutorial for that specific page.</span>
                </div>
              </div>
              <div className="knowledge-widget-item">
                <Flag size={16} className="knowledge-widget-icon" style={{ color: 'var(--color-info)' }} />
                <div>
                  Search Everything
                  <span>Use the global search bar at the very top of the CRM to instantly find contacts, companies, or orders.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
