import { Request, Response, NextFunction } from 'express';
import { AuditService, AuditContext, AuditEventData } from '../services/auditService';
import { AuthenticatedRequest } from './auth';

interface AuditOptions {
  action?: string;
  category?: AuditEventData['category'];
  resourceType?: string;
  description?: string;
  sensitivity?: AuditEventData['dataClassification'];
  skipSuccess?: boolean;
  skipFailure?: boolean;
}

export const auditMiddleware = (options: AuditOptions = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const auditService = AuditService.getInstance();

    // Store original res.json to intercept response
    const originalJson = res.json;
    let responseData: any = null;
    let statusCode = 200;

    res.json = function (data: any) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Continue with the request
    next();

    // Wait for response to complete
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const isSuccess = statusCode >= 200 && statusCode < 400;
        const isFailure = statusCode >= 400;

        // Skip if configured to skip success/failure
        if ((isSuccess && options.skipSuccess) || (isFailure && options.skipFailure)) {
          return;
        }

        // Extract organization ID from user or request
        const organizationId =
          (req as any).user?.organizationId ||
          req.body?.organizationId ||
          req.params?.organizationId ||
          req.query?.organizationId;

        if (!organizationId) {
          return; // Skip audit if no organization context
        }

        // Create audit context
        const context: AuditContext = auditService.createContextFromRequest(req, organizationId);

        // Determine action and category
        const action =
          options.action || `${req.method.toLowerCase()}_${req.route?.path || req.path}`;
        const category = options.category || deriveCategory(req);

        // Create audit event data
        const eventData: AuditEventData = {
          eventType: deriveEventType(req.method),
          action,
          category,
          description: options.description || generateDescription(req, isSuccess),
          resourceType: options.resourceType || deriveResourceType(req),
          resourceId: extractResourceId(req),
          resourceName: extractResourceName(req, responseData),
          details: sanitizeRequestDetails(req, responseData),
          severity: deriveSeverity(req, isSuccess, statusCode),
          riskLevel: deriveRiskLevel(req, isSuccess, statusCode),
          dataClassification: options.sensitivity || 'internal',
          status: isSuccess ? 'success' : 'failure',
          errorMessage: isFailure ? responseData?.message : undefined,
          duration,
          tags: generateTags(req),
        };

        // Log the audit event
        await auditService.logEvent(context, eventData);
      } catch (error) {
        console.error('Audit logging failed:', error);
        // Don't fail the request if audit logging fails
      }
    });
  };
};

// Helper functions
function deriveEventType(method: string): AuditEventData['eventType'] {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'GET':
      return 'read';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'access';
  }
}

function deriveCategory(req: Request): AuditEventData['category'] {
  const path = req.path.toLowerCase();

  if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
    return 'authentication';
  }
  if (path.includes('/user') || path.includes('/role')) {
    return 'user_management';
  }
  if (path.includes('/form') || path.includes('/data') || path.includes('/report')) {
    return 'data';
  }
  if (path.includes('/system') || path.includes('/setting')) {
    return 'system';
  }
  if (path.includes('/security') || path.includes('/audit')) {
    return 'security';
  }
  if (path.includes('/compliance') || path.includes('/policy')) {
    return 'compliance';
  }
  if (path.includes('/integration') || path.includes('/webhook')) {
    return 'integration';
  }

  return 'data';
}

function deriveResourceType(req: Request): string {
  const path = req.path.toLowerCase();
  const pathSegments = path.split('/').filter(Boolean);

  // Extract resource type from path (e.g., /api/forms/123 -> forms)
  if (pathSegments.length >= 2) {
    return pathSegments[1];
  }

  return 'unknown';
}

function extractResourceId(req: Request): string | undefined {
  // Try to extract ID from params
  const possibleIdParams = ['id', 'formId', 'userId', 'worksiteId', 'templateId'];

  for (const param of possibleIdParams) {
    if (req.params[param]) {
      return req.params[param];
    }
  }

  // Try to extract from body
  if (req.body?.id) {
    return req.body.id;
  }

  return undefined;
}

function extractResourceName(req: Request, responseData: any): string | undefined {
  if (responseData?.data?.name) return responseData.data.name;
  if (responseData?.data?.title) return responseData.data.title;
  if (responseData?.name) return responseData.name;
  if (responseData?.title) return responseData.title;
  if (req.body?.name) return req.body.name;
  if (req.body?.title) return req.body.title;

  return undefined;
}

function sanitizeRequestDetails(req: Request, responseData: any): Record<string, any> {
  const details: Record<string, any> = {};

  // Add request method and path
  details.method = req.method;
  details.path = req.path;

  // Add query parameters (if any)
  if (Object.keys(req.query).length > 0) {
    details.query = req.query;
  }

  // Add sanitized body (exclude sensitive fields)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'ssn', 'creditCard'];

    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '***REDACTED***';
      }
    });

    details.requestBody = sanitizedBody;
  }

  // Add response status
  if (responseData) {
    details.responseStatus = responseData.success ? 'success' : 'error';
    if (responseData.message) {
      details.responseMessage = responseData.message;
    }
  }

  return details;
}

function deriveSeverity(
  req: Request,
  isSuccess: boolean,
  statusCode: number
): AuditEventData['severity'] {
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'high';
  if (req.method === 'DELETE') return 'high';
  if (req.path.includes('/auth') || req.path.includes('/security')) return 'medium';
  return 'low';
}

function deriveRiskLevel(
  req: Request,
  isSuccess: boolean,
  statusCode: number
): AuditEventData['riskLevel'] {
  if (!isSuccess && req.path.includes('/auth')) return 'high';
  if (req.method === 'DELETE') return 'high';
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'medium';
  if (req.method === 'POST' || req.method === 'PUT') return 'low';
  return 'none';
}

function generateDescription(req: Request, isSuccess: boolean): string {
  const method = req.method.toUpperCase();
  const path = req.path;
  const status = isSuccess ? 'successful' : 'failed';

  return `${method} request to ${path} ${status}`;
}

function generateTags(req: Request): string[] {
  const tags: string[] = [];

  // Add method tag
  tags.push(req.method.toLowerCase());

  // Add path-based tags
  const path = req.path.toLowerCase();
  if (path.includes('/api')) tags.push('api');
  if (path.includes('/auth')) tags.push('authentication');
  if (path.includes('/admin')) tags.push('admin');
  if (path.includes('/mobile')) tags.push('mobile');

  // Add user agent tags
  const userAgent = req.get('User-Agent')?.toLowerCase() || '';
  if (userAgent.includes('mobile')) tags.push('mobile');
  if (userAgent.includes('postman')) tags.push('testing');

  return tags;
}

// Specific audit middlewares for common use cases
export const auditAuth = auditMiddleware({
  category: 'authentication',
  sensitivity: 'confidential',
});

export const auditDataAccess = auditMiddleware({
  category: 'data',
  sensitivity: 'internal',
});

export const auditUserManagement = auditMiddleware({
  category: 'user_management',
  sensitivity: 'confidential',
});

export const auditSystemChanges = auditMiddleware({
  category: 'system',
  sensitivity: 'restricted',
});

export const auditSecurityEvents = auditMiddleware({
  category: 'security',
  sensitivity: 'restricted',
});

export default auditMiddleware;
