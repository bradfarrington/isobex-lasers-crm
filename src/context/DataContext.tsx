import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { Contact, Company, LookupItem, Tag } from '@/types/database';
import * as api from '@/lib/api';
import type { DashboardStats } from '@/lib/api';

// ─── State ───────────────────────────────────────────────

interface DataState {
  contacts: Contact[];
  companies: Company[];
  tags: Tag[];
  leadSources: LookupItem[];
  leadStatuses: LookupItem[];
  companyStatuses: LookupItem[];
  productLabels: LookupItem[];
  compatibilityTypes: LookupItem[];
  dashboardStats: DashboardStats;
  loading: boolean;
  error: string | null;
}

const initialState: DataState = {
  contacts: [],
  companies: [],
  tags: [],
  leadSources: [],
  leadStatuses: [],
  companyStatuses: [],
  productLabels: [],
  compatibilityTypes: [],
  dashboardStats: {
    totalContacts: 0,
    totalCompanies: 0,
    totalCustomers: 0,
    totalLeads: 0,
  },
  loading: true,
  error: null,
};

// ─── Actions ─────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONTACTS'; payload: Contact[] }
  | { type: 'SET_COMPANIES'; payload: Company[] }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'SET_LEAD_SOURCES'; payload: LookupItem[] }
  | { type: 'SET_LEAD_STATUSES'; payload: LookupItem[] }
  | { type: 'SET_COMPANY_STATUSES'; payload: LookupItem[] }
  | { type: 'SET_PRODUCT_LABELS'; payload: LookupItem[] }
  | { type: 'SET_COMPATIBILITY_TYPES'; payload: LookupItem[] }
  | { type: 'SET_DASHBOARD_STATS'; payload: DashboardStats }
  | { type: 'ADD_CONTACT'; payload: Contact }
  | { type: 'UPDATE_CONTACT'; payload: Contact }
  | { type: 'DELETE_CONTACT'; payload: string }
  | { type: 'ADD_COMPANY'; payload: Company }
  | { type: 'UPDATE_COMPANY'; payload: Company }
  | { type: 'DELETE_COMPANY'; payload: string }
  // Lookup CRUD
  | { type: 'ADD_LOOKUP'; collection: 'leadSources' | 'leadStatuses' | 'companyStatuses' | 'productLabels' | 'compatibilityTypes'; payload: LookupItem }
  | { type: 'UPDATE_LOOKUP'; collection: 'leadSources' | 'leadStatuses' | 'companyStatuses' | 'productLabels' | 'compatibilityTypes'; payload: LookupItem }
  | { type: 'DELETE_LOOKUP'; collection: 'leadSources' | 'leadStatuses' | 'companyStatuses' | 'productLabels' | 'compatibilityTypes'; payload: string };

function dataReducer(state: DataState, action: Action): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONTACTS':
      return { ...state, contacts: action.payload };
    case 'SET_COMPANIES':
      return { ...state, companies: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    case 'DELETE_TAG':
      return { ...state, tags: state.tags.filter(t => t.id !== action.payload) };
    case 'SET_LEAD_SOURCES':
      return { ...state, leadSources: action.payload };
    case 'SET_LEAD_STATUSES':
      return { ...state, leadStatuses: action.payload };
    case 'SET_COMPANY_STATUSES':
      return { ...state, companyStatuses: action.payload };
    case 'SET_PRODUCT_LABELS':
      return { ...state, productLabels: action.payload };
    case 'SET_COMPATIBILITY_TYPES':
      return { ...state, compatibilityTypes: action.payload };
    case 'SET_DASHBOARD_STATS':
      return { ...state, dashboardStats: action.payload };

    // Contacts CRUD
    case 'ADD_CONTACT':
      return { ...state, contacts: [action.payload, ...state.contacts] };
    case 'UPDATE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.filter((c) => c.id !== action.payload),
      };

    // Companies CRUD
    case 'ADD_COMPANY':
      return { ...state, companies: [action.payload, ...state.companies] };
    case 'UPDATE_COMPANY':
      return {
        ...state,
        companies: state.companies.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_COMPANY':
      return {
        ...state,
        companies: state.companies.filter((c) => c.id !== action.payload),
      };

    // Lookup CRUD
    case 'ADD_LOOKUP':
      return {
        ...state,
        [action.collection]: [...state[action.collection], action.payload],
      };
    case 'UPDATE_LOOKUP':
      return {
        ...state,
        [action.collection]: state[action.collection].map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case 'DELETE_LOOKUP':
      return {
        ...state,
        [action.collection]: state[action.collection].filter(
          (item) => item.id !== action.payload
        ),
      };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────

interface DataContextValue {
  state: DataState;
  dispatch: React.Dispatch<Action>;
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await api.fetchDashboardStats();
      dispatch({ type: 'SET_DASHBOARD_STATS', payload: stats });
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const [contacts, companies, stats, tags, leadSources, leadStatuses, companyStatuses, productLabels, compatibilityTypes] =
        await Promise.all([
          api.fetchContacts(),
          api.fetchCompanies(),
          api.fetchDashboardStats(),
          api.fetchTags(),
          api.fetchLookup('lead_sources'),
          api.fetchLookup('lead_statuses'),
          api.fetchLookup('company_statuses'),
          api.fetchLookup('product_labels'),
          api.fetchLookup('compatibility_types'),
        ]);

      dispatch({ type: 'SET_CONTACTS', payload: contacts });
      dispatch({ type: 'SET_COMPANIES', payload: companies });
      dispatch({ type: 'SET_DASHBOARD_STATS', payload: stats });
      dispatch({ type: 'SET_TAGS', payload: tags });
      dispatch({ type: 'SET_LEAD_SOURCES', payload: leadSources });
      dispatch({ type: 'SET_LEAD_STATUSES', payload: leadStatuses });
      dispatch({ type: 'SET_COMPANY_STATUSES', payload: companyStatuses });
      dispatch({ type: 'SET_PRODUCT_LABELS', payload: productLabels });
      dispatch({ type: 'SET_COMPATIBILITY_TYPES', payload: compatibilityTypes });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load data',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ state, dispatch, refreshData, refreshStats }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
