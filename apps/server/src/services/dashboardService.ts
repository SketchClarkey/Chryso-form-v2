import { Types } from 'mongoose';
import { Dashboard, IDashboard, IDashboardWidget } from '../models/Dashboard';
import { Form } from '../models/Form';
import { Template } from '../models/Template';
import { Worksite } from '../models/Worksite';
import { User } from '../models/User';
import AnalyticsService from './analyticsService';

export interface DashboardQuery {
  category?: string;
  tags?: string[];
  search?: string;
  createdBy?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
}

export interface WidgetData {
  widgetId: string;
  data: any;
  error?: string;
  lastUpdated: Date;
  metadata?: {
    total: number;
    filtered: number;
    cacheHit: boolean;
  };
}

export class DashboardService {
  private static instance: DashboardService;
  private analyticsService = AnalyticsService.getInstance();
  private dataCache = new Map<string, { data: any; expiry: Date }>();

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async createDashboard(dashboardData: Partial<IDashboard>, userId: string): Promise<IDashboard> {
    const dashboard = new Dashboard({
      ...dashboardData,
      createdBy: userId,
      lastModifiedBy: userId,
      permissions: {
        canView: dashboardData.permissions?.canView || ['admin', 'manager', 'technician'],
        canEdit: dashboardData.permissions?.canEdit || ['admin'],
        canShare: dashboardData.permissions?.canShare || ['admin', 'manager'],
      },
    });

    await dashboard.save();
    return dashboard.populate('createdBy', 'firstName lastName email');
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<IDashboard>,
    userId: string,
    changes?: string
  ): Promise<IDashboard> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Create version history if significant changes
    if (changes && (updates.widgets || updates.layout || updates.settings)) {
      dashboard.createVersion(changes, userId);
    }

    // Apply updates
    Object.assign(dashboard, updates);
    dashboard.lastModifiedBy = new Types.ObjectId(userId);

    await dashboard.save();
    return (await dashboard.populate('createdBy', 'firstName lastName email')).populate('lastModifiedBy', 'firstName lastName email');
  }

  async getDashboards(
    query: DashboardQuery,
    userRole: string,
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    dashboards: IDashboard[];
    total: number;
    page: number;
    pages: number;
  }> {
    const filter: any = {};

    // Build query filter
    if (query.category) filter.category = query.category;
    if (query.tags?.length) filter.tags = { $in: query.tags };
    if (query.createdBy) filter.createdBy = query.createdBy;
    if (query.isTemplate !== undefined) filter.isTemplate = query.isTemplate;

    // Text search
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Access control
    if (userRole !== 'admin') {
      filter.$or = [
        { createdBy: userId },
        { 'permissions.canView': { $in: [userRole] } },
        { 'sharing.isPublic': true },
      ];
    }

    if (query.isPublic !== undefined) {
      filter['sharing.isPublic'] = query.isPublic;
    }

    const skip = (page - 1) * limit;

    const [dashboards, total] = await Promise.all([
      Dashboard.find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dashboard.countDocuments(filter),
    ]);

    return {
      dashboards: dashboards.map(d => ({
        ...d,
        widgets: this.sanitizeWidgets(d.widgets, userRole),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getDashboard(dashboardId: string, userRole: string, userId: string): Promise<IDashboard> {
    const dashboard = await Dashboard.findById(dashboardId)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (!dashboard.canAccess(userRole, userId)) {
      throw new Error('Access denied');
    }

    // Update view statistics
    dashboard.usage.totalViews += 1;
    dashboard.usage.lastViewed = new Date();
    await dashboard.save();

    return dashboard;
  }

  async generateDashboardData(
    dashboardId: string,
    userRole: string,
    userId: string,
    forceRefresh = false
  ): Promise<WidgetData[]> {
    const dashboard = await this.getDashboard(dashboardId, userRole, userId);
    const widgetDataPromises = dashboard.widgets.map(widget =>
      this.generateWidgetData(widget, userRole, forceRefresh)
    );

    const results = await Promise.allSettled(widgetDataPromises);
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          widgetId: dashboard.widgets[index].id,
          data: null,
          error: result.reason.message || 'Failed to load widget data',
          lastUpdated: new Date(),
        };
      }
    });
  }

  private async generateWidgetData(
    widget: IDashboardWidget,
    userRole: string,
    forceRefresh = false
  ): Promise<WidgetData> {
    const cacheKey = `widget:${widget.id}:${JSON.stringify(widget.config)}`;
    const cached = this.dataCache.get(cacheKey);

    if (!forceRefresh && cached && cached.expiry > new Date()) {
      return {
        widgetId: widget.id,
        data: cached.data,
        lastUpdated: new Date(),
        metadata: { total: 0, filtered: 0, cacheHit: true },
      };
    }

    let data: any;
    const startTime = Date.now();

    try {
      switch (widget.type) {
        case 'metric':
          data = await this.generateMetricData(widget, userRole);
          break;
        case 'chart':
          data = await this.generateChartData(widget, userRole);
          break;
        case 'table':
          data = await this.generateTableData(widget, userRole);
          break;
        case 'text':
          data = { content: widget.config.content || '' };
          break;
        case 'filter':
          data = await this.generateFilterData(widget, userRole);
          break;
        default:
          throw new Error(`Unknown widget type: ${widget.type}`);
      }

      // Cache the data
      const cacheExpiry = new Date();
      cacheExpiry.setSeconds(cacheExpiry.getSeconds() + (widget.config.refreshInterval || 300));
      this.dataCache.set(cacheKey, { data, expiry: cacheExpiry });

      return {
        widgetId: widget.id,
        data,
        lastUpdated: new Date(),
        metadata: {
          total: Array.isArray(data) ? data.length : 1,
          filtered: Array.isArray(data) ? data.length : 1,
          cacheHit: false,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to generate data for widget ${widget.id}: ${error.message}`);
    }
  }

  private async generateMetricData(widget: IDashboardWidget, userRole: string): Promise<any> {
    const { metric, aggregation = 'count', dateRange } = widget.config;

    if (!metric) {
      throw new Error('Metric not specified');
    }

    const query = this.buildBaseQuery(widget.config, dateRange);
    let value = 0;

    switch (metric) {
      case 'totalForms':
        value = await Form.countDocuments(query);
        break;
      case 'completedForms':
        value = await Form.countDocuments({ ...query, status: 'completed' });
        break;
      case 'activeUsers':
        const users = await Form.distinct('technicianId', query);
        value = users.length;
        break;
      case 'avgCompletionTime':
        const completedForms = await Form.find({ ...query, status: 'completed' })
          .select('createdAt updatedAt')
          .lean();
        if (completedForms.length > 0) {
          const totalTime = completedForms.reduce((sum, form) => {
            return sum + (new Date(form.updatedAt).getTime() - new Date(form.createdAt).getTime());
          }, 0);
          value = totalTime / completedForms.length / (1000 * 60 * 60); // Hours
        }
        break;
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    return {
      value,
      metric,
      aggregation,
      format: widget.config.format || 'number',
    };
  }

  private async generateChartData(widget: IDashboardWidget, userRole: string): Promise<any> {
    const { chartType, dataSource, xAxis, yAxis, dateRange } = widget.config;

    if (!dataSource || !xAxis || !yAxis?.length) {
      throw new Error('Chart configuration incomplete');
    }

    const query = this.buildBaseQuery(widget.config, dateRange);
    let aggregation: any[] = [];

    // Build aggregation pipeline based on data source
    switch (dataSource) {
      case 'forms':
        aggregation = [
          { $match: query },
          { $group: { _id: `$${xAxis}`, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ];
        break;
      case 'templates':
        aggregation = [
          { $match: query },
          {
            $lookup: { from: 'forms', localField: '_id', foreignField: 'templateId', as: 'forms' },
          },
          { $group: { _id: `$${xAxis}`, count: { $size: '$forms' } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ];
        break;
      default:
        throw new Error(`Unknown data source: ${dataSource}`);
    }

    const Model = this.getModelByDataSource(dataSource);
    const results = await Model.aggregate(aggregation);

    return {
      chartType,
      labels: results.map((r: any) => r._id || 'Unknown'),
      datasets: [
        {
          label: yAxis[0],
          data: results.map((r: any) => r.count),
        },
      ],
    };
  }

  private async generateTableData(widget: IDashboardWidget, userRole: string): Promise<any> {
    const { columns, dateRange } = widget.config;

    if (!columns?.length) {
      throw new Error('Table columns not configured');
    }

    const query = this.buildBaseQuery(widget.config, dateRange);
    const fields = columns.reduce((acc: any, col) => {
      acc[col.field] = 1;
      return acc;
    }, {});

    const data = await Form.find(query)
      .select(fields)
      .populate('technicianId', 'firstName lastName')
      .populate('worksiteId', 'name')
      .limit(100)
      .lean();

    return {
      columns: columns.map(col => ({
        field: col.field,
        header: col.header,
        sortable: col.sortable !== false,
      })),
      data: data.map(item => {
        const row: any = {};
        columns.forEach(col => {
          const value = this.getNestedValue(item, col.field);
          row[col.field] = value;
        });
        return row;
      }),
    };
  }

  private async generateFilterData(widget: IDashboardWidget, userRole: string): Promise<any> {
    const { filterType, filterOptions } = widget.config;

    if (filterOptions) {
      return { options: filterOptions };
    }

    // Generate filter options based on type
    switch (filterType) {
      case 'dropdown':
      case 'multiselect':
        // Generate options from data
        return { options: [] };
      default:
        return { options: [] };
    }
  }

  private buildBaseQuery(config: any, dateRange?: any): any {
    const query: any = {};

    // Apply date range
    if (dateRange) {
      if (dateRange.type === 'fixed' && dateRange.start && dateRange.end) {
        query.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end),
        };
      } else if (dateRange.type === 'relative' && dateRange.relativeDays) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange.relativeDays);
        query.createdAt = { $gte: startDate };
      }
    }

    // Apply filters
    if (config.filters?.length) {
      config.filters.forEach((filter: any) => {
        const { field, operator, value } = filter;
        switch (operator) {
          case 'equals':
            query[field] = value;
            break;
          case 'not_equals':
            query[field] = { $ne: value };
            break;
          case 'in':
            query[field] = { $in: Array.isArray(value) ? value : [value] };
            break;
          case 'contains':
            query[field] = { $regex: value, $options: 'i' };
            break;
        }
      });
    }

    return query;
  }

  private getModelByDataSource(dataSource: string): any {
    switch (dataSource) {
      case 'forms':
        return Form;
      case 'templates':
        return Template;
      case 'worksites':
        return Worksite;
      case 'users':
        return User;
      default:
        throw new Error(`Unknown data source: ${dataSource}`);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private sanitizeWidgets(widgets: IDashboardWidget[], userRole: string): IDashboardWidget[] {
    return widgets.filter(widget => {
      // Check widget visibility
      if (widget.visibility?.roles?.length) {
        return widget.visibility.roles.includes(userRole);
      }
      return true;
    });
  }

  async deleteDashboard(dashboardId: string, userRole: string, userId: string): Promise<void> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (!dashboard.canEdit(userRole, userId)) {
      throw new Error('Not authorized to delete this dashboard');
    }

    await Dashboard.findByIdAndDelete(dashboardId);
  }

  async duplicateDashboard(
    dashboardId: string,
    newName: string,
    userRole: string,
    userId: string
  ): Promise<IDashboard> {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (!dashboard.canAccess(userRole, userId)) {
      throw new Error('Not authorized to access this dashboard');
    }

    return dashboard.duplicate(newName, userId);
  }

  // Template management
  async getDashboardTemplates(category?: string): Promise<IDashboard[]> {
    const query: any = { isTemplate: true };
    if (category) query['templateMetadata.category'] = category;

    return Dashboard.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ 'usage.totalViews': -1 })
      .lean();
  }

  async createDashboardFromTemplate(
    templateId: string,
    name: string,
    userId: string
  ): Promise<IDashboard> {
    const template = await Dashboard.findById(templateId);
    if (!template || !template.isTemplate) {
      throw new Error('Dashboard template not found');
    }

    return template.duplicate(name, userId);
  }

  // Cleanup cache periodically
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, value] of this.dataCache.entries()) {
      if (value.expiry <= now) {
        this.dataCache.delete(key);
      }
    }
  }
}

export default DashboardService;
