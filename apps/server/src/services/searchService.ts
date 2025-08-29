import { Form } from '../models/Form';
import { Template } from '../models/Template';
import { User } from '../models/User';
import { Worksite } from '../models/Worksite';
import { Dashboard } from '../models/Dashboard';

export interface SearchResult {
  id: string;
  type: 'form' | 'template' | 'user' | 'worksite' | 'dashboard';
  title: string;
  description?: string;
  excerpt?: string;
  metadata: {
    createdAt?: Date;
    updatedAt?: Date;
    status?: string;
    category?: string;
    tags?: string[];
    createdBy?: string;
    location?: string;
  };
  relevanceScore: number;
}

export interface SearchOptions {
  query: string;
  types?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    status?: string[];
    category?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    createdBy?: string;
    tags?: string[];
  };
}

export class SearchService {
  private static instance: SearchService;

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async globalSearch(
    options: SearchOptions,
    userRole: string,
    userId: string
  ): Promise<{
    results: SearchResult[];
    total: number;
    facets: {
      types: { type: string; count: number }[];
      statuses: { status: string; count: number }[];
      categories: { category: string; count: number }[];
    };
  }> {
    const {
      query,
      types = ['form', 'template', 'user', 'worksite', 'dashboard'],
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      filters = {},
    } = options;

    const searchPromises: Promise<SearchResult[]>[] = [];

    // Search across different entity types
    if (types.includes('form')) {
      searchPromises.push(this.searchForms(query, filters, userRole, userId));
    }
    if (types.includes('template')) {
      searchPromises.push(this.searchTemplates(query, filters, userRole, userId));
    }
    if (types.includes('user')) {
      searchPromises.push(this.searchUsers(query, filters, userRole, userId));
    }
    if (types.includes('worksite')) {
      searchPromises.push(this.searchWorksites(query, filters, userRole, userId));
    }
    if (types.includes('dashboard')) {
      searchPromises.push(this.searchDashboards(query, filters, userRole, userId));
    }

    const allResults = await Promise.all(searchPromises);
    const combinedResults = allResults.flat();

    // Calculate facets
    const facets = this.calculateFacets(combinedResults);

    // Sort results
    const sortedResults = this.sortResults(combinedResults, sortBy, sortOrder);

    // Apply pagination
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total: combinedResults.length,
      facets,
    };
  }

  private async searchForms(
    query: string,
    filters: SearchOptions['filters'] = {},
    userRole: string,
    userId: string
  ): Promise<SearchResult[]> {
    const searchCriteria: any = {};

    // Text search
    if (query) {
      searchCriteria.$or = [
        { formId: { $regex: query, $options: 'i' } },
        { 'customerInfo.customerName': { $regex: query, $options: 'i' } },
        { 'customerInfo.contactEmail': { $regex: query, $options: 'i' } },
        { 'additionalInfo.notes': { $regex: query, $options: 'i' } },
        { 'maintenanceDetails.maintenanceProcedures': { $regex: query, $options: 'i' } },
      ];
    }

    // Apply filters
    if (filters.status?.length) {
      searchCriteria.status = { $in: filters.status };
    }
    if (filters.dateFrom || filters.dateTo) {
      searchCriteria.createdAt = {};
      if (filters.dateFrom) searchCriteria.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) searchCriteria.createdAt.$lte = filters.dateTo;
    }
    if (filters.createdBy) {
      searchCriteria.technician = filters.createdBy;
    }

    // Access control
    if (userRole !== 'admin') {
      searchCriteria.$or = [{ technician: userId }, { 'permissions.canView': { $in: [userRole] } }];
    }

    const forms = await Form.find(searchCriteria)
      .populate('technician', 'firstName lastName')
      .populate('worksite', 'name address')
      .populate('template', 'name')
      .limit(100)
      .lean();

    return forms.map(
      (form): SearchResult => ({
        id: form._id.toString(),
        type: 'form',
        title: form.formId || `Form #${form._id.toString().slice(-6)}`,
        description: form.customerInfo?.customerName || 'No customer',
        excerpt: this.extractExcerpt(
          form.additionalInfo?.notes || form.maintenanceDetails?.maintenanceProcedures,
          query
        ),
        metadata: {
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
          status: form.status,
          category: 'form',
          createdBy: form.technician
            ? `${(form.technician as any)?.firstName || ''} ${(form.technician as any)?.lastName || ''}`.trim() ||
              undefined
            : undefined,
          location: (form.worksite as any)?.name,
        },
        relevanceScore: this.calculateRelevance(query, [
          form.formId || '',
          form.customerInfo?.customerName || '',
          form.additionalInfo?.notes || '',
          form.maintenanceDetails?.maintenanceProcedures || '',
        ]),
      })
    );
  }

  private async searchTemplates(
    query: string,
    filters: SearchOptions['filters'] = {},
    userRole: string,
    userId: string
  ): Promise<SearchResult[]> {
    const searchCriteria: any = {};

    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ];
    }

    if (filters.category?.length) {
      searchCriteria.category = { $in: filters.category };
    }
    if (filters.tags?.length) {
      searchCriteria.tags = { $in: filters.tags };
    }

    const templates = await Template.find(searchCriteria)
      .populate('createdBy', 'firstName lastName')
      .limit(100)
      .lean();

    return templates.map(
      (template): SearchResult => ({
        id: template._id.toString(),
        type: 'template',
        title: template.name,
        description: template.description,
        excerpt: this.extractExcerpt(template.description, query),
        metadata: {
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          category: template.category,
          tags: template.tags,
          createdBy: template.createdBy
            ? `${(template.createdBy as any)?.firstName || ''} ${(template.createdBy as any)?.lastName || ''}`.trim() ||
              undefined
            : undefined,
        },
        relevanceScore: this.calculateRelevance(query, [
          template.name,
          template.description || '',
          ...(template.tags || []),
        ]),
      })
    );
  }

  private async searchUsers(
    query: string,
    filters: SearchOptions['filters'] = {},
    userRole: string,
    userId: string
  ): Promise<SearchResult[]> {
    if (userRole !== 'admin' && userRole !== 'manager') {
      return []; // Restrict user search to admin/manager roles
    }

    const searchCriteria: any = {};

    if (query) {
      searchCriteria.$or = [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    const users = await User.find(searchCriteria).select('-password').limit(50).lean();

    return users.map(
      (user): SearchResult => ({
        id: user._id.toString(),
        type: 'user',
        title: `${user.firstName} ${user.lastName}`,
        description: user.email,
        excerpt: `${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`,
        metadata: {
          createdAt: user.createdAt,
          category: user.role,
        },
        relevanceScore: this.calculateRelevance(query, [
          user.firstName,
          user.lastName,
          user.email,
          user.role || '',
        ]),
      })
    );
  }

  private async searchWorksites(
    query: string,
    filters: SearchOptions['filters'] = {},
    userRole: string,
    userId: string
  ): Promise<SearchResult[]> {
    const searchCriteria: any = {};

    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { 'address.street': { $regex: query, $options: 'i' } },
        { 'address.city': { $regex: query, $options: 'i' } },
        { customerName: { $regex: query, $options: 'i' } },
      ];
    }

    const worksites = await Worksite.find(searchCriteria)
      .populate('defaultTemplates.templateId', 'name')
      .limit(100)
      .lean();

    return worksites.map(
      (worksite): SearchResult => ({
        id: worksite._id.toString(),
        type: 'worksite',
        title: worksite.name,
        description: `${worksite.address.street}, ${worksite.address.city}`,
        excerpt: worksite.customerName,
        metadata: {
          createdAt: worksite.createdAt,
          updatedAt: worksite.updatedAt,
          category: 'worksite',
          location: `${worksite.address.city}, ${worksite.address.state}`,
        },
        relevanceScore: this.calculateRelevance(query, [
          worksite.name,
          worksite.address.street || '',
          worksite.address.city || '',
          worksite.customerName || '',
        ]),
      })
    );
  }

  private async searchDashboards(
    query: string,
    filters: SearchOptions['filters'] = {},
    userRole: string,
    userId: string
  ): Promise<SearchResult[]> {
    const searchCriteria: any = {};

    if (query) {
      searchCriteria.$text = { $search: query };
    }

    if (filters.category?.length) {
      searchCriteria.category = { $in: filters.category };
    }
    if (filters.tags?.length) {
      searchCriteria.tags = { $in: filters.tags };
    }

    // Access control
    if (userRole !== 'admin') {
      searchCriteria.$or = [
        { createdBy: userId },
        { 'permissions.canView': { $in: [userRole] } },
        { 'sharing.isPublic': true },
      ];
    }

    const dashboards = await Dashboard.find(searchCriteria)
      .populate('createdBy', 'firstName lastName')
      .limit(100)
      .lean();

    return dashboards.map(
      (dashboard): SearchResult => ({
        id: dashboard._id.toString(),
        type: 'dashboard',
        title: dashboard.name,
        description: dashboard.description,
        excerpt: this.extractExcerpt(dashboard.description, query),
        metadata: {
          createdAt: (dashboard as any).createdAt,
          updatedAt: (dashboard as any).updatedAt,
          category: dashboard.category,
          tags: dashboard.tags,
          createdBy: dashboard.createdBy
            ? `${(dashboard.createdBy as any)?.firstName || ''} ${(dashboard.createdBy as any)?.lastName || ''}`.trim() ||
              undefined
            : undefined,
        },
        relevanceScore: this.calculateRelevance(query, [
          dashboard.name,
          dashboard.description || '',
          ...(dashboard.tags || []),
        ]),
      })
    );
  }

  private extractExcerpt(text: string | undefined, query: string, maxLength = 150): string {
    if (!text) return '';

    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/);

    // Find sentence containing query words
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (queryWords.some(word => lowerSentence.includes(word))) {
        const trimmed = sentence.trim();
        if (trimmed.length <= maxLength) return trimmed;
        return `${trimmed.substring(0, maxLength - 3)}...`;
      }
    }

    // Fallback to beginning of text
    return text.length <= maxLength ? text : `${text.substring(0, maxLength - 3)}...`;
  }

  private calculateRelevance(query: string, fields: string[]): number {
    if (!query) return 1;

    const queryWords = query.toLowerCase().split(/\s+/);
    let score = 0;

    fields.forEach(field => {
      if (!field) return;

      const fieldLower = field.toLowerCase();

      // Exact match gets highest score
      if (fieldLower.includes(query.toLowerCase())) {
        score += 10;
      }

      // Word matches
      queryWords.forEach(word => {
        if (fieldLower.includes(word)) {
          score += 5;
        }
      });

      // Prefix matches
      queryWords.forEach(word => {
        if (fieldLower.startsWith(word)) {
          score += 3;
        }
      });
    });

    return Math.max(score, 1);
  }

  private sortResults(
    results: SearchResult[],
    sortBy: 'relevance' | 'date' | 'name',
    sortOrder: 'asc' | 'desc'
  ): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          const dateA = a.metadata.updatedAt || a.metadata.createdAt || new Date(0);
          const dateB = b.metadata.updatedAt || b.metadata.createdAt || new Date(0);
          comparison = dateB.getTime() - dateA.getTime();
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }

  private calculateFacets(results: SearchResult[]) {
    const typeCounts: { [key: string]: number } = {};
    const statusCounts: { [key: string]: number } = {};
    const categoryCounts: { [key: string]: number } = {};

    results.forEach(result => {
      // Type facets
      typeCounts[result.type] = (typeCounts[result.type] || 0) + 1;

      // Status facets
      if (result.metadata.status) {
        statusCounts[result.metadata.status] = (statusCounts[result.metadata.status] || 0) + 1;
      }

      // Category facets
      if (result.metadata.category) {
        categoryCounts[result.metadata.category] =
          (categoryCounts[result.metadata.category] || 0) + 1;
      }
    });

    return {
      types: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
      statuses: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      categories: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
    };
  }

  async getSearchSuggestions(query: string, userRole: string, userId: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const suggestions: Set<string> = new Set();

    // Get form suggestions
    const forms = await Form.find({
      $or: [
        { formId: { $regex: `^${query}`, $options: 'i' } },
        { 'customerInfo.customerName': { $regex: `^${query}`, $options: 'i' } },
      ],
    })
      .select('formId customerInfo.customerName')
      .limit(5)
      .lean();

    forms.forEach(form => {
      if (form.formId?.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.add(form.formId);
      }
      if (form.customerInfo?.customerName?.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.add(form.customerInfo.customerName);
      }
    });

    // Get template suggestions
    const templates = await Template.find({
      name: { $regex: `^${query}`, $options: 'i' },
    })
      .select('name')
      .limit(5)
      .lean();

    templates.forEach(template => {
      if (template.name.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.add(template.name);
      }
    });

    // Get worksite suggestions
    const worksites = await Worksite.find({
      $or: [
        { name: { $regex: `^${query}`, $options: 'i' } },
        { 'address.city': { $regex: `^${query}`, $options: 'i' } },
      ],
    })
      .select('name address.city')
      .limit(5)
      .lean();

    worksites.forEach(worksite => {
      if (worksite.name.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.add(worksite.name);
      }
      if (worksite.address?.city?.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.add(worksite.address.city);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }
}

export default SearchService;
