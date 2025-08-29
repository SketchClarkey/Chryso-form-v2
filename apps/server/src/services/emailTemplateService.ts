import { EmailTemplate, IEmailTemplate } from '../models/EmailTemplate';
import Handlebars from 'handlebars';

export class EmailTemplateService {
  private static instance: EmailTemplateService;

  static getInstance(): EmailTemplateService {
    if (!EmailTemplateService.instance) {
      EmailTemplateService.instance = new EmailTemplateService();
    }
    return EmailTemplateService.instance;
  }

  constructor() {
    this.registerHelpers();
  }

  private registerHelpers() {
    // Register Handlebars helpers for common template operations
    Handlebars.registerHelper('formatDate', (date: Date, format: string = 'YYYY-MM-DD') => {
      if (!date) return '';

      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      switch (format) {
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD HH:MM':
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        case 'long':
          return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        default:
          return d.toLocaleDateString();
      }
    });

    Handlebars.registerHelper('currency', (amount: number, currency: string = 'USD') => {
      if (typeof amount !== 'number') return amount;

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);

    Handlebars.registerHelper(
      'ifCond',
      function (this: any, v1: any, operator: string, v2: any, options: any) {
        switch (operator) {
          case '==':
            return v1 == v2 ? options.fn(this) : options.inverse(this);
          case '===':
            return v1 === v2 ? options.fn(this) : options.inverse(this);
          case '!=':
            return v1 != v2 ? options.fn(this) : options.inverse(this);
          case '!==':
            return v1 !== v2 ? options.fn(this) : options.inverse(this);
          case '<':
            return v1 < v2 ? options.fn(this) : options.inverse(this);
          case '<=':
            return v1 <= v2 ? options.fn(this) : options.inverse(this);
          case '>':
            return v1 > v2 ? options.fn(this) : options.inverse(this);
          case '>=':
            return v1 >= v2 ? options.fn(this) : options.inverse(this);
          case '&&':
            return v1 && v2 ? options.fn(this) : options.inverse(this);
          case '||':
            return v1 || v2 ? options.fn(this) : options.inverse(this);
          default:
            return options.inverse(this);
        }
      }
    );
  }

  async createSystemTemplates(organizationId: string, userId: string): Promise<IEmailTemplate[]> {
    const systemTemplates = [
      {
        name: 'Welcome Email',
        description: 'Welcome new users to the platform',
        category: 'system',
        type: 'welcome',
        subject: 'Welcome to {{organizationName}}!',
        htmlContent: this.getDefaultWelcomeTemplate(),
        variables: [
          {
            name: 'userName',
            description: "User's full name",
            type: 'string',
            required: true,
            example: 'John Doe',
          },
          {
            name: 'userEmail',
            description: "User's email address",
            type: 'string',
            required: true,
            example: 'john@example.com',
          },
          {
            name: 'organizationName',
            description: 'Organization name',
            type: 'string',
            required: true,
            example: 'Acme Corp',
          },
          {
            name: 'loginUrl',
            description: 'Login URL',
            type: 'string',
            required: true,
            example: 'https://app.chrysoform.com/login',
          },
        ],
      },
      {
        name: 'Form Notification',
        description: 'Notify users about form submissions',
        category: 'notification',
        type: 'form_notification',
        subject: 'New form submission: {{formName}}',
        htmlContent: this.getDefaultFormNotificationTemplate(),
        variables: [
          {
            name: 'formName',
            description: 'Name of the form',
            type: 'string',
            required: true,
            example: 'Safety Inspection',
          },
          {
            name: 'submitterName',
            description: 'Person who submitted the form',
            type: 'string',
            required: true,
            example: 'Jane Smith',
          },
          {
            name: 'submissionDate',
            description: 'Date of submission',
            type: 'date',
            required: true,
            example: '2024-01-15T10:30:00Z',
          },
          {
            name: 'formUrl',
            description: 'URL to view the form',
            type: 'string',
            required: true,
            example: 'https://app.chrysoform.com/forms/123',
          },
          {
            name: 'formData',
            description: 'Form submission data',
            type: 'object',
            required: false,
            example: { priority: 'High', notes: 'Urgent issue found' },
          },
        ],
      },
      {
        name: 'Password Reset',
        description: 'Password reset instructions',
        category: 'system',
        type: 'password_reset',
        subject: 'Reset your password',
        htmlContent: this.getDefaultPasswordResetTemplate(),
        variables: [
          {
            name: 'userName',
            description: "User's full name",
            type: 'string',
            required: true,
            example: 'John Doe',
          },
          {
            name: 'resetUrl',
            description: 'Password reset URL',
            type: 'string',
            required: true,
            example: 'https://app.chrysoform.com/reset?token=abc123',
          },
          {
            name: 'expiryTime',
            description: 'Reset link expiry time',
            type: 'date',
            required: true,
            example: '2024-01-15T12:00:00Z',
          },
        ],
      },
      {
        name: 'Form Reminder',
        description: 'Remind users about pending forms',
        category: 'workflow',
        type: 'form_reminder',
        subject: 'Reminder: {{formName}} requires your attention',
        htmlContent: this.getDefaultFormReminderTemplate(),
        variables: [
          {
            name: 'userName',
            description: "User's name",
            type: 'string',
            required: true,
            example: 'John Doe',
          },
          {
            name: 'formName',
            description: 'Name of the form',
            type: 'string',
            required: true,
            example: 'Monthly Report',
          },
          {
            name: 'dueDate',
            description: 'Form due date',
            type: 'date',
            required: false,
            example: '2024-01-20T23:59:59Z',
          },
          {
            name: 'formUrl',
            description: 'URL to access the form',
            type: 'string',
            required: true,
            example: 'https://app.chrysoform.com/forms/456',
          },
          {
            name: 'daysPending',
            description: 'Days since assignment',
            type: 'number',
            required: false,
            example: 3,
          },
        ],
      },
      {
        name: 'System Alert',
        description: 'System maintenance and alert notifications',
        category: 'system',
        type: 'system_alert',
        subject: 'System Alert: {{alertType}}',
        htmlContent: this.getDefaultSystemAlertTemplate(),
        variables: [
          {
            name: 'alertType',
            description: 'Type of alert',
            type: 'string',
            required: true,
            example: 'Maintenance',
          },
          {
            name: 'alertMessage',
            description: 'Alert message',
            type: 'string',
            required: true,
            example: 'Scheduled maintenance tonight',
          },
          {
            name: 'startTime',
            description: 'Start time',
            type: 'date',
            required: false,
            example: '2024-01-15T02:00:00Z',
          },
          {
            name: 'endTime',
            description: 'End time',
            type: 'date',
            required: false,
            example: '2024-01-15T06:00:00Z',
          },
          {
            name: 'impact',
            description: 'Expected impact',
            type: 'string',
            required: false,
            example: 'System will be unavailable',
          },
        ],
      },
    ];

    const createdTemplates: IEmailTemplate[] = [];

    for (const template of systemTemplates) {
      try {
        const existingTemplate = await EmailTemplate.findOne({
          organizationId,
          type: template.type,
          isSystem: true,
        });

        if (!existingTemplate) {
          const newTemplate = new EmailTemplate({
            ...template,
            organizationId,
            isSystem: true,
            isActive: true,
            settings: {
              priority: 'normal',
              trackOpens: true,
              trackClicks: true,
            },
            localization: {
              defaultLanguage: 'en',
              translations: [],
            },
            triggers: [],
            usage: {
              sentCount: 0,
            },
            createdBy: userId,
            updatedBy: userId,
          });

          const savedTemplate = await newTemplate.save();
          createdTemplates.push(savedTemplate);
        }
      } catch (error) {
        console.error(`Failed to create system template ${template.type}:`, error);
      }
    }

    return createdTemplates;
  }

  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    language: string = 'en'
  ): Promise<{ subject: string; htmlContent: string; textContent?: string }> {
    const template = await EmailTemplate.findById(templateId);

    if (!template || !template.isActive) {
      throw new Error('Template not found or inactive');
    }

    // Find appropriate content based on language
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    if (language !== template.localization.defaultLanguage) {
      const translation = template.localization.translations.find(t => t.language === language);
      if (translation) {
        subject = translation.subject;
        htmlContent = translation.htmlContent;
        textContent = translation.textContent;
      }
    }

    // Validate required variables
    const missingVariables = template.variables
      .filter(v => v.required && !(v.name in variables))
      .map(v => v.name);

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Apply default values for missing optional variables
    const contextVariables = { ...variables };
    template.variables.forEach(v => {
      if (!(v.name in contextVariables) && v.defaultValue !== undefined) {
        contextVariables[v.name] = v.defaultValue;
      }
    });

    // Compile and render templates
    const subjectTemplate = Handlebars.compile(subject);
    const htmlTemplate = Handlebars.compile(htmlContent);
    const textTemplate = textContent ? Handlebars.compile(textContent) : null;

    return {
      subject: subjectTemplate(contextVariables),
      htmlContent: htmlTemplate(contextVariables),
      textContent: textTemplate ? textTemplate(contextVariables) : undefined,
    };
  }

  validateTemplate(
    subject: string,
    htmlContent: string,
    variables: any[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate subject
    if (!subject || subject.trim().length === 0) {
      errors.push('Subject is required');
    }

    // Validate HTML content
    if (!htmlContent || htmlContent.trim().length === 0) {
      errors.push('HTML content is required');
    }

    try {
      // Try to compile templates to check for syntax errors
      Handlebars.compile(subject);
      Handlebars.compile(htmlContent);
    } catch (error: any) {
      errors.push(`Template syntax error: ${error.message}`);
    }

    // Validate variables
    if (variables) {
      variables.forEach((variable, index) => {
        if (!variable.name || variable.name.trim().length === 0) {
          errors.push(`Variable ${index + 1}: name is required`);
        }
        if (!variable.description || variable.description.trim().length === 0) {
          errors.push(`Variable ${index + 1}: description is required`);
        }
        if (!['string', 'number', 'date', 'boolean', 'array', 'object'].includes(variable.type)) {
          errors.push(`Variable ${index + 1}: invalid type`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private getDefaultWelcomeTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{organizationName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1976d2; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #1976d2; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{organizationName}}!</h1>
        </div>
        <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>We're excited to have you join our team! Your account has been created and you can now access our Chryso-form platform.</p>
            
            <p><strong>Your account details:</strong></p>
            <ul>
                <li>Email: {{userEmail}}</li>
                <li>Organization: {{organizationName}}</li>
            </ul>
            
            <p>Click the button below to log in and get started:</p>
            <a href="{{loginUrl}}" class="button">Access Platform</a>
            
            <p>If you have any questions or need assistance, don't hesitate to reach out to your administrator.</p>
            
            <p>Best regards,<br>The {{organizationName}} Team</p>
        </div>
        <div class="footer">
            <p>This email was sent automatically. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getDefaultFormNotificationTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Form Submission</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4caf50; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #4caf50; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0; }
        .info-box { background-color: white; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 New Form Submission</h1>
        </div>
        <div class="content">
            <h2>Form: {{formName}}</h2>
            
            <div class="info-box">
                <p><strong>Submitted by:</strong> {{submitterName}}</p>
                <p><strong>Submission Date:</strong> {{formatDate submissionDate 'YYYY-MM-DD HH:MM'}}</p>
            </div>
            
            {{#if formData}}
            <h3>Form Details:</h3>
            <ul>
                {{#each formData}}
                <li><strong>{{@key}}:</strong> {{this}}</li>
                {{/each}}
            </ul>
            {{/if}}
            
            <p>Click the button below to view the complete submission:</p>
            <a href="{{formUrl}}" class="button">View Form</a>
            
            <p>Please review this submission and take any necessary action.</p>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getDefaultPasswordResetTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #ff9800; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Password Reset Request</h1>
        </div>
        <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>We received a request to reset your password. If you made this request, click the button below to reset your password:</p>
            
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            
            <div class="warning">
                <strong>Important:</strong> This reset link will expire on {{formatDate expiryTime 'YYYY-MM-DD HH:MM'}}.
            </div>
            
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, please don't share this reset link with anyone.</p>
            
            <p>If you have any concerns about your account security, please contact your administrator immediately.</p>
        </div>
        <div class="footer">
            <p>This email was sent automatically. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getDefaultFormReminderTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196f3; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #2196f3; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0; }
        .reminder-box { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Form Reminder</h1>
        </div>
        <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>This is a friendly reminder about a form that requires your attention.</p>
            
            <div class="reminder-box">
                <h3>{{formName}}</h3>
                {{#if daysPending}}
                <p><strong>Pending for:</strong> {{daysPending}} day{{#ifCond daysPending '!=' 1}}s{{/ifCond}}</p>
                {{/if}}
                {{#if dueDate}}
                <p><strong>Due Date:</strong> {{formatDate dueDate 'long'}}</p>
                {{/if}}
            </div>
            
            <p>Please complete this form at your earliest convenience:</p>
            <a href="{{formUrl}}" class="button">Complete Form</a>
            
            <p>If you have any questions about this form, please contact your supervisor or administrator.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
        </div>
        <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getDefaultSystemAlertTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background-color: #ffebee; border: 1px solid #f44336; color: #c62828; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .schedule-box { background-color: white; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ System Alert</h1>
        </div>
        <div class="content">
            <div class="alert-box">
                <h2>{{alertType}}</h2>
                <p>{{alertMessage}}</p>
            </div>
            
            {{#if startTime}}
            <div class="schedule-box">
                <h3>Schedule:</h3>
                <p><strong>Start:</strong> {{formatDate startTime 'YYYY-MM-DD HH:MM'}}</p>
                {{#if endTime}}
                <p><strong>End:</strong> {{formatDate endTime 'YYYY-MM-DD HH:MM'}}</p>
                {{/if}}
                {{#if impact}}
                <p><strong>Expected Impact:</strong> {{impact}}</p>
                {{/if}}
            </div>
            {{/if}}
            
            <p>We apologize for any inconvenience this may cause. Please plan accordingly and contact support if you have any questions.</p>
            
            <p>Thank you for your understanding.</p>
        </div>
        <div class="footer">
            <p>This is an automated system alert. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
  }
}

export default EmailTemplateService;
