import { Form } from '../models/Form';
import { Template } from '../models/Template';
import { Worksite } from '../models/Worksite';
import { User } from '../models/User';

export interface AnalyticsQuery {
  dateRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: {
    worksites?: string[];
    templates?: string[];
    technicians?: string[];
    categories?: string[];
    status?: string[];
  };
  groupBy?: string[];
}

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  changePercentage?: number;
  metadata?: any;
}

export interface MetricData {
  current: number;
  previous?: number;
  change?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'time';
}

export interface AnalyticsResult {
  metrics: {
    [key: string]: MetricData;
  };
  trends: {
    [key: string]: TrendData[];
  };
  distributions: {
    [key: string]: Array<{ label: string; value: number; percentage: number }>;
  };
  comparisons: {
    [key: string]: Array<{ category: string; current: number; previous: number }>;
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async generateAnalytics(query: AnalyticsQuery, userRole: string): Promise<AnalyticsResult> {
    const metrics = await this.calculateMetrics(query, userRole);
    const trends = await this.calculateTrends(query, userRole);
    const distributions = await this.calculateDistributions(query, userRole);
    const comparisons = await this.calculateComparisons(query, userRole);

    return {
      metrics,
      trends,
      distributions,
      comparisons,
    };
  }

  private async calculateMetrics(
    query: AnalyticsQuery,
    userRole: string
  ): Promise<{ [key: string]: MetricData }> {
    const { dateRange, filters } = query;
    const previousPeriod = this.getPreviousPeriod(dateRange);

    // Build base query
    const baseQuery: any = {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    };
    const previousQuery: any = {
      createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
    };

    // Apply filters
    this.applyFilters(baseQuery, filters);
    this.applyFilters(previousQuery, filters);

    // Calculate form metrics
    const [
      totalForms,
      previousForms,
      completedForms,
      previousCompleted,
      avgCompletionTime,
      previousAvgTime,
      activeUsers,
      previousActiveUsers,
    ] = await Promise.all([
      Form.countDocuments(baseQuery),
      Form.countDocuments(previousQuery),
      Form.countDocuments({ ...baseQuery, status: 'completed' }),
      Form.countDocuments({ ...previousQuery, status: 'completed' }),
      this.calculateAverageCompletionTime(baseQuery),
      this.calculateAverageCompletionTime(previousQuery),
      this.calculateActiveUsers(baseQuery),
      this.calculateActiveUsers(previousQuery),
    ]);

    return {
      totalForms: {
        current: totalForms,
        previous: previousForms,
        change: totalForms - previousForms,
        changePercentage:
          previousForms > 0 ? ((totalForms - previousForms) / previousForms) * 100 : 0,
        trend: totalForms > previousForms ? 'up' : totalForms < previousForms ? 'down' : 'stable',
        format: 'number',
      },
      completedForms: {
        current: completedForms,
        previous: previousCompleted,
        change: completedForms - previousCompleted,
        changePercentage:
          previousCompleted > 0
            ? ((completedForms - previousCompleted) / previousCompleted) * 100
            : 0,
        trend:
          completedForms > previousCompleted
            ? 'up'
            : completedForms < previousCompleted
              ? 'down'
              : 'stable',
        format: 'number',
      },
      completionRate: {
        current: totalForms > 0 ? (completedForms / totalForms) * 100 : 0,
        previous: previousForms > 0 ? (previousCompleted / previousForms) * 100 : 0,
        change: 0,
        changePercentage: 0,
        trend: 'stable',
        format: 'percentage',
      },
      avgCompletionTime: {
        current: avgCompletionTime,
        previous: previousAvgTime,
        change: avgCompletionTime - previousAvgTime,
        changePercentage:
          previousAvgTime > 0 ? ((avgCompletionTime - previousAvgTime) / previousAvgTime) * 100 : 0,
        trend:
          avgCompletionTime < previousAvgTime
            ? 'up'
            : avgCompletionTime > previousAvgTime
              ? 'down'
              : 'stable',
        format: 'time',
      },
      activeUsers: {
        current: activeUsers,
        previous: previousActiveUsers,
        change: activeUsers - previousActiveUsers,
        changePercentage:
          previousActiveUsers > 0
            ? ((activeUsers - previousActiveUsers) / previousActiveUsers) * 100
            : 0,
        trend:
          activeUsers > previousActiveUsers
            ? 'up'
            : activeUsers < previousActiveUsers
              ? 'down'
              : 'stable',
        format: 'number',
      },
    };
  }

  private async calculateTrends(
    query: AnalyticsQuery,
    userRole: string
  ): Promise<{ [key: string]: TrendData[] }> {
    const { dateRange, granularity, filters } = query;
    const periods = this.generatePeriods(dateRange, granularity);

    const formTrends: TrendData[] = [];
    const completionTrends: TrendData[] = [];
    const userActivityTrends: TrendData[] = [];

    for (const period of periods) {
      const periodQuery: any = {
        createdAt: { $gte: period.start, $lte: period.end },
      };
      this.applyFilters(periodQuery, filters);

      const [formCount, completedCount, activeUsers] = await Promise.all([
        Form.countDocuments(periodQuery),
        Form.countDocuments({ ...periodQuery, status: 'completed' }),
        this.calculateActiveUsers(periodQuery),
      ]);

      formTrends.push({
        period: period.label,
        value: formCount,
        metadata: { start: period.start, end: period.end },
      });

      completionTrends.push({
        period: period.label,
        value: completedCount,
        metadata: { start: period.start, end: period.end },
      });

      userActivityTrends.push({
        period: period.label,
        value: activeUsers,
        metadata: { start: period.start, end: period.end },
      });
    }

    // Calculate change percentages
    this.calculateTrendChanges(formTrends);
    this.calculateTrendChanges(completionTrends);
    this.calculateTrendChanges(userActivityTrends);

    return {
      formCreation: formTrends,
      formCompletion: completionTrends,
      userActivity: userActivityTrends,
    };
  }

  private async calculateDistributions(
    query: AnalyticsQuery,
    userRole: string
  ): Promise<{ [key: string]: Array<{ label: string; value: number; percentage: number }> }> {
    const { dateRange, filters } = query;
    const baseQuery: any = {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    };
    this.applyFilters(baseQuery, filters);

    // Status distribution
    const statusDistribution = await Form.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Template usage distribution
    const templateDistribution = await Form.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: 'templates',
          localField: 'templateId',
          foreignField: '_id',
          as: 'template',
        },
      },
      { $unwind: '$template' },
      { $group: { _id: '$template.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Worksite activity distribution
    const worksiteDistribution = await Form.aggregate([
      { $match: baseQuery },
      {
        $lookup: { from: 'worksites', localField: 'worksite', foreignField: '_id', as: 'worksite' },
      },
      { $unwind: '$worksite' },
      { $group: { _id: '$worksite.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // User activity distribution (if authorized)
    let userDistribution: any[] = [];
    if (['admin', 'manager'].includes(userRole)) {
      userDistribution = await Form.aggregate([
        { $match: baseQuery },
        { $lookup: { from: 'users', localField: 'technician', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $group: {
            _id: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);
    }

    const totalForms = await Form.countDocuments(baseQuery);

    const formatDistribution = (data: any[]) =>
      data.map(item => ({
        label: item._id || 'Unknown',
        value: item.count,
        percentage: totalForms > 0 ? (item.count / totalForms) * 100 : 0,
      }));

    return {
      statusDistribution: formatDistribution(statusDistribution),
      templateUsage: formatDistribution(templateDistribution),
      worksiteDistribution: formatDistribution(worksiteDistribution),
      ...(userDistribution.length > 0 && { userActivity: formatDistribution(userDistribution) }),
    };
  }

  private async calculateComparisons(
    query: AnalyticsQuery,
    userRole: string
  ): Promise<{ [key: string]: Array<{ category: string; current: number; previous: number }> }> {
    const { dateRange, filters } = query;
    const previousPeriod = this.getPreviousPeriod(dateRange);

    const baseQuery: any = {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end },
    };
    const previousQuery: any = {
      createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
    };

    this.applyFilters(baseQuery, filters);
    this.applyFilters(previousQuery, filters);

    // Template comparison
    const [currentTemplates, previousTemplates] = await Promise.all([
      Form.aggregate([
        { $match: baseQuery },
        {
          $lookup: {
            from: 'templates',
            localField: 'templateId',
            foreignField: '_id',
            as: 'template',
          },
        },
        { $unwind: '$template' },
        { $group: { _id: '$template.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Form.aggregate([
        { $match: previousQuery },
        {
          $lookup: {
            from: 'templates',
            localField: 'templateId',
            foreignField: '_id',
            as: 'template',
          },
        },
        { $unwind: '$template' },
        { $group: { _id: '$template.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const templateComparison = this.mergeComparisons(currentTemplates, previousTemplates);

    // Basic comparison data
    const [totalForms, previousForms, completedForms, previousCompleted] = await Promise.all([
      Form.countDocuments(baseQuery),
      Form.countDocuments(previousQuery),
      Form.countDocuments({ ...baseQuery, status: 'completed' }),
      Form.countDocuments({ ...previousQuery, status: 'completed' }),
    ]);

    const periodComparison = [
      {
        category: 'Total Forms',
        current: totalForms,
        previous: previousForms,
      },
      {
        category: 'Completed Forms',
        current: completedForms,
        previous: previousCompleted,
      },
    ];

    return {
      templateComparison,
      periodComparison,
    };
  }

  // Helper methods
  private applyFilters(query: any, filters?: AnalyticsQuery['filters']): void {
    if (!filters) return;

    if (filters.worksites?.length) {
      query.worksite = { $in: filters.worksites };
    }
    if (filters.templates?.length) {
      query['metadata.templateUsed'] = { $in: filters.templates };
    }
    if (filters.technicians?.length) {
      query.technician = { $in: filters.technicians };
    }
    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }
  }

  private getPreviousPeriod(dateRange: { start: Date; end: Date }): { start: Date; end: Date } {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.start.getTime()),
    };
  }

  private generatePeriods(
    dateRange: { start: Date; end: Date },
    granularity: string
  ): Array<{ start: Date; end: Date; label: string }> {
    const periods: Array<{ start: Date; end: Date; label: string }> = [];
    const current = new Date(dateRange.start);

    while (current < dateRange.end) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);

      switch (granularity) {
        case 'hour':
          periodEnd.setHours(periodEnd.getHours() + 1);
          break;
        case 'day':
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'week':
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'month':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
        case 'quarter':
          periodEnd.setMonth(periodEnd.getMonth() + 3);
          break;
        case 'year':
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          break;
      }

      if (periodEnd > dateRange.end) {
        periodEnd.setTime(dateRange.end.getTime());
      }

      periods.push({
        start: periodStart,
        end: periodEnd,
        label: this.formatPeriodLabel(periodStart, granularity),
      });

      current.setTime(periodEnd.getTime());
    }

    return periods;
  }

  private formatPeriodLabel(date: Date, granularity: string): string {
    switch (granularity) {
      case 'hour':
        return `${date.toISOString().slice(0, 13)}:00`;
      case 'day':
        return date.toISOString().slice(0, 10);
      case 'week':
        return `Week of ${date.toISOString().slice(0, 10)}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toISOString().slice(0, 10);
    }
  }

  private calculateTrendChanges(trends: TrendData[]): void {
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i].value;
      const previous = trends[i - 1].value;
      trends[i].change = current - previous;
      trends[i].changePercentage = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    }
  }

  private async calculateAverageCompletionTime(query: any): Promise<number> {
    const completedForms = await Form.find({ ...query, status: 'completed' })
      .select('createdAt updatedAt')
      .lean();

    if (completedForms.length === 0) return 0;

    const totalTime = completedForms.reduce((sum, form) => {
      const completionTime =
        new Date(form.updatedAt).getTime() - new Date(form.createdAt).getTime();
      return sum + completionTime;
    }, 0);

    return Math.round(totalTime / completedForms.length / (1000 * 60 * 60)); // Convert to hours
  }

  private async calculateActiveUsers(query: any): Promise<number> {
    const uniqueUsers = await Form.distinct('technician', query);
    return uniqueUsers.length;
  }

  private mergeComparisons(
    current: any[],
    previous: any[]
  ): Array<{ category: string; current: number; previous: number }> {
    const merged: { [key: string]: { current: number; previous: number } } = {};

    current.forEach(item => {
      merged[item._id] = { current: item.count, previous: 0 };
    });

    previous.forEach(item => {
      if (merged[item._id]) {
        merged[item._id].previous = item.count;
      } else {
        merged[item._id] = { current: 0, previous: item.count };
      }
    });

    return Object.entries(merged).map(([category, values]) => ({
      category,
      current: values.current,
      previous: values.previous,
    }));
  }
}

export default AnalyticsService;
