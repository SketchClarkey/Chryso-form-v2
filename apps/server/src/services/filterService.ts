import { FilterQuery } from 'mongoose';

export interface FilterCriteria {
  id: string;
  field: string;
  operator:
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan'
    | 'greaterThanOrEqual'
    | 'lessThanOrEqual'
    | 'between'
    | 'in'
    | 'notIn'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'isTrue'
    | 'isFalse'
    | 'dateEquals'
    | 'dateBefore'
    | 'dateAfter'
    | 'dateBetween'
    | 'dateToday'
    | 'dateYesterday'
    | 'dateThisWeek'
    | 'dateThisMonth'
    | 'dateThisYear';
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  logicalOperator?: 'AND' | 'OR';
}

export interface FilterGroup {
  id: string;
  name: string;
  criteria: FilterCriteria[];
  logicalOperator: 'AND' | 'OR';
  isActive: boolean;
}

export interface AdvancedFilter {
  id?: string;
  name: string;
  description?: string;
  entityType: 'form' | 'template' | 'user' | 'worksite' | 'dashboard' | 'all';
  groups: FilterGroup[];
  globalLogicalOperator: 'AND' | 'OR';
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    limit: number;
    offset: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isShared: boolean;
  tags: string[];
}

export class FilterService {
  private static instance: FilterService;

  static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService();
    }
    return FilterService.instance;
  }

  buildMongoQuery(filter: AdvancedFilter): FilterQuery<any> {
    const query: FilterQuery<any> = {};

    if (filter.groups.length === 0) {
      return {};
    }

    const activeGroups = filter.groups.filter(group => group.isActive);
    if (activeGroups.length === 0) {
      return {};
    }

    if (activeGroups.length === 1) {
      return this.buildGroupQuery(activeGroups[0]);
    }

    // Multiple groups - combine with global logical operator
    const groupQueries = activeGroups.map(group => this.buildGroupQuery(group));

    if (filter.globalLogicalOperator === 'OR') {
      query.$or = groupQueries;
    } else {
      query.$and = groupQueries;
    }

    return query;
  }

  private buildGroupQuery(group: FilterGroup): FilterQuery<any> {
    if (group.criteria.length === 0) {
      return {};
    }

    if (group.criteria.length === 1) {
      return this.buildCriteriaQuery(group.criteria[0]);
    }

    // Multiple criteria - combine with group logical operator
    const criteriaQueries = group.criteria.map(criteria => this.buildCriteriaQuery(criteria));

    if (group.logicalOperator === 'OR') {
      return { $or: criteriaQueries };
    } else {
      return { $and: criteriaQueries };
    }
  }

  private buildCriteriaQuery(criteria: FilterCriteria): FilterQuery<any> {
    const { field, operator, value, dataType } = criteria;
    const query: FilterQuery<any> = {};

    switch (operator) {
      case 'equals':
        query[field] = value;
        break;

      case 'notEquals':
        query[field] = { $ne: value };
        break;

      case 'contains':
        if (dataType === 'string') {
          query[field] = { $regex: value, $options: 'i' };
        } else if (dataType === 'array') {
          query[field] = { $in: Array.isArray(value) ? value : [value] };
        }
        break;

      case 'notContains':
        if (dataType === 'string') {
          query[field] = { $not: { $regex: value, $options: 'i' } };
        } else if (dataType === 'array') {
          query[field] = { $nin: Array.isArray(value) ? value : [value] };
        }
        break;

      case 'startsWith':
        query[field] = { $regex: `^${this.escapeRegex(value)}`, $options: 'i' };
        break;

      case 'endsWith':
        query[field] = { $regex: `${this.escapeRegex(value)}$`, $options: 'i' };
        break;

      case 'greaterThan':
        query[field] = { $gt: this.convertValue(value, dataType) };
        break;

      case 'lessThan':
        query[field] = { $lt: this.convertValue(value, dataType) };
        break;

      case 'greaterThanOrEqual':
        query[field] = { $gte: this.convertValue(value, dataType) };
        break;

      case 'lessThanOrEqual':
        query[field] = { $lte: this.convertValue(value, dataType) };
        break;

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          query[field] = {
            $gte: this.convertValue(value[0], dataType),
            $lte: this.convertValue(value[1], dataType),
          };
        }
        break;

      case 'in':
        query[field] = { $in: Array.isArray(value) ? value : [value] };
        break;

      case 'notIn':
        query[field] = { $nin: Array.isArray(value) ? value : [value] };
        break;

      case 'isEmpty':
        if (dataType === 'string') {
          query[field] = { $in: ['', null, undefined] };
        } else if (dataType === 'array') {
          query[field] = { $size: 0 };
        } else {
          query[field] = { $in: [null, undefined] };
        }
        break;

      case 'isNotEmpty':
        if (dataType === 'string') {
          query[field] = { $nin: ['', null, undefined] };
        } else if (dataType === 'array') {
          query[field] = { $not: { $size: 0 } };
        } else {
          query[field] = { $nin: [null, undefined] };
        }
        break;

      case 'isTrue':
        query[field] = true;
        break;

      case 'isFalse':
        query[field] = false;
        break;

      // Date operators
      case 'dateEquals':
        query[field] = {
          $gte: new Date(new Date(value).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(value).setHours(23, 59, 59, 999)),
        };
        break;

      case 'dateBefore':
        query[field] = { $lt: new Date(value) };
        break;

      case 'dateAfter':
        query[field] = { $gt: new Date(value) };
        break;

      case 'dateBetween':
        if (Array.isArray(value) && value.length === 2) {
          query[field] = {
            $gte: new Date(value[0]),
            $lte: new Date(value[1]),
          };
        }
        break;

      case 'dateToday':
        const today = new Date();
        query[field] = {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999)),
        };
        break;

      case 'dateYesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query[field] = {
          $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          $lt: new Date(yesterday.setHours(23, 59, 59, 999)),
        };
        break;

      case 'dateThisWeek':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        query[field] = { $gte: weekStart, $lte: weekEnd };
        break;

      case 'dateThisMonth':
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        monthEnd.setHours(23, 59, 59, 999);

        query[field] = { $gte: monthStart, $lte: monthEnd };
        break;

      case 'dateThisYear':
        const yearStart = new Date();
        yearStart.setMonth(0, 1);
        yearStart.setHours(0, 0, 0, 0);

        const yearEnd = new Date(yearStart);
        yearEnd.setFullYear(yearEnd.getFullYear() + 1);
        yearEnd.setDate(0);
        yearEnd.setHours(23, 59, 59, 999);

        query[field] = { $gte: yearStart, $lte: yearEnd };
        break;
    }

    return query;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private convertValue(value: any, dataType: string): any {
    switch (dataType) {
      case 'number':
        return Number(value);
      case 'date':
        return new Date(value);
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  getAvailableFields(entityType: string): { [key: string]: any } {
    const commonFields = {
      _id: { label: 'ID', type: 'string', searchable: false },
      createdAt: { label: 'Created Date', type: 'date', searchable: true },
      updatedAt: { label: 'Updated Date', type: 'date', searchable: true },
    };

    switch (entityType) {
      case 'form':
        return {
          ...commonFields,
          formId: { label: 'Form ID', type: 'string', searchable: true },
          status: {
            label: 'Status',
            type: 'string',
            searchable: true,
            options: ['draft', 'in-progress', 'completed', 'approved', 'rejected'],
          },
          'customerInfo.customerName': { label: 'Customer Name', type: 'string', searchable: true },
          'customerInfo.contactEmail': {
            label: 'Customer Email',
            type: 'string',
            searchable: true,
          },
          'customerInfo.contactPhone': {
            label: 'Customer Phone',
            type: 'string',
            searchable: true,
          },
          'formData.notes': { label: 'Notes', type: 'string', searchable: true },
          priority: {
            label: 'Priority',
            type: 'string',
            searchable: true,
            options: ['low', 'medium', 'high', 'urgent'],
          },
          technicianId: { label: 'Technician', type: 'object', searchable: true },
          worksiteId: { label: 'Worksite', type: 'object', searchable: true },
        };

      case 'template':
        return {
          ...commonFields,
          name: { label: 'Template Name', type: 'string', searchable: true },
          description: { label: 'Description', type: 'string', searchable: true },
          category: {
            label: 'Category',
            type: 'string',
            searchable: true,
            options: ['inspection', 'maintenance', 'safety', 'compliance', 'other'],
          },
          tags: { label: 'Tags', type: 'array', searchable: true },
          isActive: { label: 'Active', type: 'boolean', searchable: true },
          version: { label: 'Version', type: 'number', searchable: true },
        };

      case 'user':
        return {
          ...commonFields,
          firstName: { label: 'First Name', type: 'string', searchable: true },
          lastName: { label: 'Last Name', type: 'string', searchable: true },
          email: { label: 'Email', type: 'string', searchable: true },
          role: {
            label: 'Role',
            type: 'string',
            searchable: true,
            options: ['admin', 'manager', 'technician'],
          },
          isActive: { label: 'Active', type: 'boolean', searchable: true },
          lastLogin: { label: 'Last Login', type: 'date', searchable: true },
        };

      case 'worksite':
        return {
          ...commonFields,
          name: { label: 'Worksite Name', type: 'string', searchable: true },
          location: { label: 'Location', type: 'string', searchable: true },
          clientName: { label: 'Client Name', type: 'string', searchable: true },
          description: { label: 'Description', type: 'string', searchable: true },
          isActive: { label: 'Active', type: 'boolean', searchable: true },
        };

      case 'dashboard':
        return {
          ...commonFields,
          name: { label: 'Dashboard Name', type: 'string', searchable: true },
          description: { label: 'Description', type: 'string', searchable: true },
          category: {
            label: 'Category',
            type: 'string',
            searchable: true,
            options: ['personal', 'team', 'organization', 'public'],
          },
          tags: { label: 'Tags', type: 'array', searchable: true },
        };

      default:
        return commonFields;
    }
  }

  getOperatorsForType(dataType: string): string[] {
    switch (dataType) {
      case 'string':
        return [
          'equals',
          'notEquals',
          'contains',
          'notContains',
          'startsWith',
          'endsWith',
          'isEmpty',
          'isNotEmpty',
        ];

      case 'number':
        return [
          'equals',
          'notEquals',
          'greaterThan',
          'lessThan',
          'greaterThanOrEqual',
          'lessThanOrEqual',
          'between',
          'isEmpty',
          'isNotEmpty',
        ];

      case 'boolean':
        return ['isTrue', 'isFalse'];

      case 'date':
        return [
          'dateEquals',
          'dateBefore',
          'dateAfter',
          'dateBetween',
          'dateToday',
          'dateYesterday',
          'dateThisWeek',
          'dateThisMonth',
          'dateThisYear',
        ];

      case 'array':
        return ['contains', 'notContains', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];

      case 'object':
        return ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];

      default:
        return ['equals', 'notEquals'];
    }
  }

  validateFilter(filter: AdvancedFilter): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!filter.name?.trim()) {
      errors.push('Filter name is required');
    }

    if (!filter.entityType) {
      errors.push('Entity type is required');
    }

    if (!filter.groups || filter.groups.length === 0) {
      errors.push('At least one filter group is required');
    }

    filter.groups.forEach((group, groupIndex) => {
      if (!group.name?.trim()) {
        errors.push(`Group ${groupIndex + 1}: Name is required`);
      }

      if (!group.criteria || group.criteria.length === 0) {
        errors.push(`Group ${groupIndex + 1}: At least one criteria is required`);
      }

      group.criteria.forEach((criteria, criteriaIndex) => {
        if (!criteria.field) {
          errors.push(`Group ${groupIndex + 1}, Criteria ${criteriaIndex + 1}: Field is required`);
        }

        if (!criteria.operator) {
          errors.push(
            `Group ${groupIndex + 1}, Criteria ${criteriaIndex + 1}: Operator is required`
          );
        }

        if (criteria.value === undefined || criteria.value === null) {
          const operatorsWithoutValue = [
            'isEmpty',
            'isNotEmpty',
            'isTrue',
            'isFalse',
            'dateToday',
            'dateYesterday',
            'dateThisWeek',
            'dateThisMonth',
            'dateThisYear',
          ];
          if (!operatorsWithoutValue.includes(criteria.operator)) {
            errors.push(
              `Group ${groupIndex + 1}, Criteria ${criteriaIndex + 1}: Value is required for operator ${criteria.operator}`
            );
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default FilterService;
