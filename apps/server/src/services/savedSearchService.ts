import { FilterQuery } from 'mongoose';

export interface QuickFilter {
  id: string;
  name: string;
  description?: string;
  entityType: 'form' | 'template' | 'user' | 'worksite' | 'dashboard' | 'all';
  filterCriteria: {
    field: string;
    operator: string;
    value: any;
    dataType: string;
  };
  icon?: string;
  color?: string;
  isSystem: boolean;
  usage: {
    totalUses: number;
    lastUsed?: Date;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  entityType: 'form' | 'template' | 'user' | 'worksite' | 'dashboard' | 'all';
  filters: {
    field: string;
    operator: string;
    value: any;
  }[];
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  columns: string[];
  isPublic: boolean;
  isPinned: boolean;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usage: {
    totalUses: number;
    lastUsed?: Date;
    avgResultCount: number;
  };
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  category: 'common' | 'workflow' | 'status' | 'date' | 'custom';
  entityType: string;
  quickFilters: string[]; // IDs of quick filters
  advancedFilter?: any; // Full advanced filter object
  autoApply: boolean;
  isDefault: boolean;
  isSystem: boolean;
  order: number;
}

export class SavedSearchService {
  private static instance: SavedSearchService;

  static getInstance(): SavedSearchService {
    if (!SavedSearchService.instance) {
      SavedSearchService.instance = new SavedSearchService();
    }
    return SavedSearchService.instance;
  }

  // Quick Filters
  getSystemQuickFilters(entityType: string): QuickFilter[] {
    const baseFilters = [
      {
        id: 'today',
        name: 'Today',
        description: 'Items created today',
        entityType: 'all',
        filterCriteria: {
          field: 'createdAt',
          operator: 'dateToday',
          value: null,
          dataType: 'date',
        },
        icon: 'today',
        color: 'primary',
        isSystem: true,
        usage: { totalUses: 0 },
      },
      {
        id: 'thisWeek',
        name: 'This Week',
        description: 'Items created this week',
        entityType: 'all',
        filterCriteria: {
          field: 'createdAt',
          operator: 'dateThisWeek',
          value: null,
          dataType: 'date',
        },
        icon: 'date_range',
        color: 'info',
        isSystem: true,
        usage: { totalUses: 0 },
      },
      {
        id: 'thisMonth',
        name: 'This Month',
        description: 'Items created this month',
        entityType: 'all',
        filterCriteria: {
          field: 'createdAt',
          operator: 'dateThisMonth',
          value: null,
          dataType: 'date',
        },
        icon: 'calendar_month',
        color: 'success',
        isSystem: true,
        usage: { totalUses: 0 },
      },
    ] as QuickFilter[];

    const entitySpecificFilters: { [key: string]: QuickFilter[] } = {
      form: [
        {
          id: 'draft',
          name: 'Draft',
          description: 'Draft forms',
          entityType: 'form',
          filterCriteria: {
            field: 'status',
            operator: 'equals',
            value: 'draft',
            dataType: 'string',
          },
          icon: 'edit',
          color: 'warning',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'completed',
          name: 'Completed',
          description: 'Completed forms',
          entityType: 'form',
          filterCriteria: {
            field: 'status',
            operator: 'equals',
            value: 'completed',
            dataType: 'string',
          },
          icon: 'check_circle',
          color: 'success',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'urgent',
          name: 'Urgent',
          description: 'High priority forms',
          entityType: 'form',
          filterCriteria: {
            field: 'priority',
            operator: 'in',
            value: ['high', 'urgent'],
            dataType: 'string',
          },
          icon: 'priority_high',
          color: 'error',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
      template: [
        {
          id: 'active_templates',
          name: 'Active',
          description: 'Active templates',
          entityType: 'template',
          filterCriteria: {
            field: 'isActive',
            operator: 'isTrue',
            value: true,
            dataType: 'boolean',
          },
          icon: 'check_circle',
          color: 'success',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'safety_templates',
          name: 'Safety',
          description: 'Safety templates',
          entityType: 'template',
          filterCriteria: {
            field: 'category',
            operator: 'equals',
            value: 'safety',
            dataType: 'string',
          },
          icon: 'security',
          color: 'warning',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'maintenance_templates',
          name: 'Maintenance',
          description: 'Maintenance templates',
          entityType: 'template',
          filterCriteria: {
            field: 'category',
            operator: 'equals',
            value: 'maintenance',
            dataType: 'string',
          },
          icon: 'build',
          color: 'info',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
      user: [
        {
          id: 'active_users',
          name: 'Active',
          description: 'Active users',
          entityType: 'user',
          filterCriteria: {
            field: 'isActive',
            operator: 'isTrue',
            value: true,
            dataType: 'boolean',
          },
          icon: 'person',
          color: 'success',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'technicians',
          name: 'Technicians',
          description: 'Technician users',
          entityType: 'user',
          filterCriteria: {
            field: 'role',
            operator: 'equals',
            value: 'technician',
            dataType: 'string',
          },
          icon: 'engineering',
          color: 'primary',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
      worksite: [
        {
          id: 'active_worksites',
          name: 'Active',
          description: 'Active worksites',
          entityType: 'worksite',
          filterCriteria: {
            field: 'isActive',
            operator: 'isTrue',
            value: true,
            dataType: 'boolean',
          },
          icon: 'location_on',
          color: 'success',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
      dashboard: [
        {
          id: 'shared_dashboards',
          name: 'Shared',
          description: 'Shared dashboards',
          entityType: 'dashboard',
          filterCriteria: {
            field: 'isShared',
            operator: 'isTrue',
            value: true,
            dataType: 'boolean',
          },
          icon: 'share',
          color: 'info',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'personal_dashboards',
          name: 'Personal',
          description: 'Personal dashboards',
          entityType: 'dashboard',
          filterCriteria: {
            field: 'category',
            operator: 'equals',
            value: 'personal',
            dataType: 'string',
          },
          icon: 'person',
          color: 'primary',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
    };

    const commonFilters = baseFilters.filter(
      f => f.entityType === 'all' || f.entityType === entityType
    );
    const specificFilters = entitySpecificFilters[entityType] || [];

    return [...commonFilters, ...specificFilters];
  }

  getDefaultPresets(entityType: string): FilterPreset[] {
    const presets: FilterPreset[] = [
      {
        id: 'recent_items',
        name: 'Recent Items',
        description: 'Items from the last 7 days',
        category: 'date',
        entityType,
        quickFilters: ['today', 'thisWeek'],
        autoApply: false,
        isDefault: true,
        isSystem: true,
        order: 1,
      },
      {
        id: 'status_workflow',
        name: 'Status Workflow',
        description: 'Common status filters',
        category: 'status',
        entityType,
        quickFilters: entityType === 'form' ? ['draft', 'completed'] : [`active_${entityType}`],
        autoApply: false,
        isDefault: false,
        isSystem: true,
        order: 2,
      },
    ];

    if (entityType === 'form') {
      presets.push({
        id: 'priority_workflow',
        name: 'Priority Workflow',
        description: 'Priority-based filters',
        category: 'workflow',
        entityType,
        quickFilters: ['urgent'],
        autoApply: false,
        isDefault: false,
        isSystem: true,
        order: 3,
      });
    }

    return presets;
  }

  buildQuickFilterQuery(quickFilter: QuickFilter): FilterQuery<any> {
    const { field, operator, value, dataType } = quickFilter.filterCriteria;

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'in':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      case 'dateToday':
        const today = new Date();
        return {
          [field]: {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999)),
          },
        };
      case 'dateThisWeek':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { [field]: { $gte: weekStart, $lte: weekEnd } };
      case 'dateThisMonth':
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        monthEnd.setHours(23, 59, 59, 999);
        return { [field]: { $gte: monthStart, $lte: monthEnd } };
      case 'isTrue':
        return { [field]: true };
      case 'isFalse':
        return { [field]: false };
      default:
        return { [field]: value };
    }
  }

  combineQuickFilters(quickFilters: QuickFilter[]): FilterQuery<any> {
    if (quickFilters.length === 0) return {};
    if (quickFilters.length === 1) return this.buildQuickFilterQuery(quickFilters[0]);

    const queries = quickFilters.map(qf => this.buildQuickFilterQuery(qf));
    return { $and: queries };
  }

  validateSavedSearch(search: Partial<SavedSearch>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!search.name?.trim()) {
      errors.push('Search name is required');
    }

    if (!search.query?.trim()) {
      errors.push('Search query is required');
    }

    if (!search.entityType) {
      errors.push('Entity type is required');
    }

    if (!search.createdBy) {
      errors.push('Created by is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  generateSearchSummary(search: SavedSearch): string {
    const parts: string[] = [];

    if (search.query) {
      parts.push(`"${search.query}"`);
    }

    if (search.filters && search.filters.length > 0) {
      const filterSummary = search.filters
        .map(f => `${f.field} ${f.operator} ${f.value}`)
        .join(', ');
      parts.push(`[${filterSummary}]`);
    }

    if (search.sorting) {
      parts.push(`sorted by ${search.sorting.field} (${search.sorting.direction})`);
    }

    return parts.join(' • ');
  }

  getPopularSearches(entityType: string, limit: number = 10): Promise<SavedSearch[]> {
    // In a real implementation, this would query the database
    // For now, return mock popular searches
    const mockPopularSearches: SavedSearch[] = [
      {
        id: '1',
        name: 'Urgent Forms This Week',
        description: 'High priority forms from this week',
        query: 'urgent priority inspection',
        entityType: 'form',
        filters: [
          { field: 'priority', operator: 'equals', value: 'urgent' },
          { field: 'createdAt', operator: 'dateThisWeek', value: null },
        ],
        sorting: { field: 'createdAt', direction: 'desc' },
        columns: ['formId', 'status', 'priority', 'createdAt'],
        isPublic: true,
        isPinned: false,
        tags: ['urgent', 'priority'],
        createdBy: 'system',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        usage: { totalUses: 456, lastUsed: new Date(), avgResultCount: 23 },
      },
      {
        id: '2',
        name: 'Completed Inspections',
        description: 'All completed inspection forms',
        query: 'completed inspection',
        entityType: 'form',
        filters: [
          { field: 'status', operator: 'equals', value: 'completed' },
          { field: 'formData.type', operator: 'contains', value: 'inspection' },
        ],
        sorting: { field: 'completedAt', direction: 'desc' },
        columns: ['formId', 'customerName', 'completedAt'],
        isPublic: true,
        isPinned: true,
        tags: ['completed', 'inspection'],
        createdBy: 'system',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-10'),
        usage: { totalUses: 789, lastUsed: new Date('2024-01-20'), avgResultCount: 67 },
      },
    ];

    return Promise.resolve(
      mockPopularSearches.filter(s => entityType === 'all' || s.entityType === entityType)
    );
  }

  async saveSearch(searchData: Partial<SavedSearch>, userId: string): Promise<SavedSearch> {
    const validation = this.validateSavedSearch(searchData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const savedSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      name: searchData.name!,
      description: searchData.description,
      query: searchData.query!,
      entityType: searchData.entityType!,
      filters: searchData.filters || [],
      sorting: searchData.sorting || { field: 'createdAt', direction: 'desc' },
      columns: searchData.columns || [],
      isPublic: searchData.isPublic || false,
      isPinned: searchData.isPinned || false,
      tags: searchData.tags || [],
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: { totalUses: 0, avgResultCount: 0 },
    };

    // In a real implementation, save to database
    return savedSearch;
  }
}

export default SavedSearchService;
