/**
 * @swagger
 * @swagger
 * /settings:
 *   get:
 *     summary: Get application settings
 *     description: Retrieve application settings (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       properties:
 *                         general:
 *                           type: object
 *                           properties:
 *                             appName:
 *                               type: string
 *                               example: Chryso Forms
 *                             appDescription:
 *                               type: string
 *                               example: Chemical treatment form management system
 *                             timezone:
 *                               type: string
 *                               example: America/New_York
 *                             dateFormat:
 *                               type: string
 *                               example: MM/DD/YYYY
 *                             currency:
 *                               type: string
 *                               example: USD
 *                             language:
 *                               type: string
 *                               example: en
 *                         security:
 *                           type: object
 *                           properties:
 *                             passwordMinLength:
 *                               type: integer
 *                               example: 8
 *                             passwordRequireSpecialChars:
 *                               type: boolean
 *                               example: true
 *                             sessionTimeout:
 *                               type: integer
 *                               description: Session timeout in minutes
 *                               example: 120
 *                             maxLoginAttempts:
 *                               type: integer
 *                               example: 5
 *                             lockoutDuration:
 *                               type: integer
 *                               description: Account lockout duration in minutes
 *                               example: 30
 *                             requireEmailVerification:
 *                               type: boolean
 *                               example: true
 *                         email:
 *                           type: object
 *                           properties:
 *                             smtpHost:
 *                               type: string
 *                               example: smtp.gmail.com
 *                             smtpPort:
 *                               type: integer
 *                               example: 587
 *                             smtpSecure:
 *                               type: boolean
 *                               example: false
 *                             smtpUser:
 *                               type: string
 *                               example: noreply@example.com
 *                             fromName:
 *                               type: string
 *                               example: Chryso Forms
 *                             fromEmail:
 *                               type: string
 *                               example: noreply@example.com
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             enableEmailNotifications:
 *                               type: boolean
 *                               example: true
 *                             enablePushNotifications:
 *                               type: boolean
 *                               example: false
 *                             formSubmissionNotifications:
 *                               type: boolean
 *                               example: true
 *                             approvalNotifications:
 *                               type: boolean
 *                               example: true
 *                             overdueFormNotifications:
 *                               type: boolean
 *                               example: true
 *                         storage:
 *                           type: object
 *                           properties:
 *                             provider:
 *                               type: string
 *                               enum: [local, aws-s3, azure-blob, google-cloud]
 *                               example: local
 *                             maxFileSize:
 *                               type: integer
 *                               description: Maximum file size in MB
 *                               example: 10
 *                             allowedFileTypes:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: [pdf, jpg, png, doc, docx, xls, xlsx]
 *                         backup:
 *                           type: object
 *                           properties:
 *                             enableAutomaticBackups:
 *                               type: boolean
 *                               example: true
 *                             backupFrequency:
 *                               type: string
 *                               enum: [daily, weekly, monthly]
 *                               example: daily
 *                             retentionDays:
 *                               type: integer
 *                               example: 30
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *   put:
 *     summary: Update application settings
 *     description: Update application settings (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               general:
 *                 type: object
 *                 properties:
 *                   appName:
 *                     type: string
 *                   appDescription:
 *                     type: string
 *                   timezone:
 *                     type: string
 *                   dateFormat:
 *                     type: string
 *                   currency:
 *                     type: string
 *                   language:
 *                     type: string
 *               security:
 *                 type: object
 *                 properties:
 *                   passwordMinLength:
 *                     type: integer
 *                     minimum: 6
 *                     maximum: 20
 *                   passwordRequireSpecialChars:
 *                     type: boolean
 *                   sessionTimeout:
 *                     type: integer
 *                     minimum: 15
 *                     maximum: 480
 *                   maxLoginAttempts:
 *                     type: integer
 *                     minimum: 3
 *                     maximum: 10
 *                   lockoutDuration:
 *                     type: integer
 *                     minimum: 5
 *                     maximum: 120
 *                   requireEmailVerification:
 *                     type: boolean
 *               email:
 *                 type: object
 *                 properties:
 *                   smtpHost:
 *                     type: string
 *                   smtpPort:
 *                     type: integer
 *                   smtpSecure:
 *                     type: boolean
 *                   smtpUser:
 *                     type: string
 *                   smtpPassword:
 *                     type: string
 *                     description: Will be encrypted before storage
 *                   fromName:
 *                     type: string
 *                   fromEmail:
 *                     type: string
 *                     format: email
 *               notifications:
 *                 type: object
 *                 properties:
 *                   enableEmailNotifications:
 *                     type: boolean
 *                   enablePushNotifications:
 *                     type: boolean
 *                   formSubmissionNotifications:
 *                     type: boolean
 *                   approvalNotifications:
 *                     type: boolean
 *                   overdueFormNotifications:
 *                     type: boolean
 *               storage:
 *                 type: object
 *                 properties:
 *                   provider:
 *                     type: string
 *                     enum: [local, aws-s3, azure-blob, google-cloud]
 *                   maxFileSize:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                   allowedFileTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   awsAccessKey:
 *                     type: string
 *                   awsSecretKey:
 *                     type: string
 *                   awsBucket:
 *                     type: string
 *                   awsRegion:
 *                     type: string
 *               backup:
 *                 type: object
 *                 properties:
 *                   enableAutomaticBackups:
 *                     type: boolean
 *                   backupFrequency:
 *                     type: string
 *                     enum: [daily, weekly, monthly]
 *                   retentionDays:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 365
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Settings updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       description: Updated settings object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /settings/test-email:
 *   post:
 *     summary: Test email configuration
 *     description: Send a test email to verify email settings (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientEmail
 *             properties:
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               subject:
 *                 type: string
 *                 default: Test Email from Chryso Forms
 *               message:
 *                 type: string
 *                 default: This is a test email to verify your email configuration.
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Test email sent successfully
 *       400:
 *         description: Email configuration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /settings/backup:
 *   post:
 *     summary: Create manual backup
 *     description: Manually trigger a database backup (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeFiles:
 *                 type: boolean
 *                 default: true
 *                 description: Include uploaded files in backup
 *               description:
 *                 type: string
 *                 example: Manual backup before system update
 *     responses:
 *       202:
 *         description: Backup process started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Backup process started
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupId:
 *                       type: string
 *                       example: backup_20240115_143022
 *                     estimatedCompletion:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /settings/backup/status:
 *   get:
 *     summary: Get backup status
 *     description: Get the status of backup operations (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Backup status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentBackup:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [in_progress, completed, failed]
 *                         progress:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                     recentBackups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           status:
 *                             type: string
 *                           size:
 *                             type: string
 *                             example: 25.6 MB
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           description:
 *                             type: string
 *                     nextScheduledBackup:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /settings/audit-log:
 *   get:
 *     summary: Get audit log
 *     description: Retrieve system audit log (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           action:
 *                             type: string
 *                             example: user_login
 *                           userId:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           ipAddress:
 *                             type: string
 *                           userAgent:
 *                             type: string
 *                           details:
 *                             type: object
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           level:
 *                             type: string
 *                             enum: [info, warning, error, critical]
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /settings/system-info:
 *   get:
 *     summary: Get system information
 *     description: Retrieve system information and health status (admin only)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     application:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: Chryso Forms API
 *                         version:
 *                           type: string
 *                           example: 2.0.0
 *                         environment:
 *                           type: string
 *                           example: production
 *                         nodeVersion:
 *                           type: string
 *                           example: v18.17.0
 *                         uptime:
 *                           type: string
 *                           example: 5 days, 3 hours
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [connected, disconnected, error]
 *                         version:
 *                           type: string
 *                           example: 6.0.8
 *                         collections:
 *                           type: integer
 *                           example: 12
 *                         totalDocuments:
 *                           type: integer
 *                           example: 15847
 *                         databaseSize:
 *                           type: string
 *                           example: 125.3 MB
 *                     system:
 *                       type: object
 *                       properties:
 *                         platform:
 *                           type: string
 *                           example: linux
 *                         architecture:
 *                           type: string
 *                           example: x64
 *                         cpuUsage:
 *                           type: number
 *                           example: 15.6
 *                         memoryUsage:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: string
 *                               example: 256.8 MB
 *                             total:
 *                               type: string
 *                               example: 1024 MB
 *                             percentage:
 *                               type: number
 *                               example: 25.1
 *                         diskUsage:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: string
 *                               example: 12.5 GB
 *                             total:
 *                               type: string
 *                               example: 50 GB
 *                             percentage:
 *                               type: number
 *                               example: 25.0
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */