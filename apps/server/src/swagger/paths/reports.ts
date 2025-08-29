/**
 * @swagger
 * @swagger
 * /reports:
 *   get:
 *     summary: Get all reports
 *     description: Retrieve a paginated list of reports accessible to the user
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of reports per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, detailed, analytics, compliance]
 *         description: Filter by report type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by report status
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
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
 *                     reports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: Monthly Chemical Report
 *                           type:
 *                             type: string
 *                             enum: [summary, detailed, analytics, compliance]
 *                           status:
 *                             type: string
 *                             enum: [pending, processing, completed, failed]
 *                           createdBy:
 *                             $ref: '#/components/schemas/User'
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           parameters:
 *                             type: object
 *                           downloadUrl:
 *                             type: string
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
 *   post:
 *     summary: Generate a new report
 *     description: Create and generate a new report
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - parameters
 *             properties:
 *               name:
 *                 type: string
 *                 example: Monthly Chemical Report - January 2024
 *               type:
 *                 type: string
 *                 enum: [summary, detailed, analytics, compliance]
 *                 example: summary
 *               parameters:
 *                 type: object
 *                 properties:
 *                   dateRange:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         format: date
 *                         example: '2024-01-01'
 *                       end:
 *                         type: string
 *                         format: date
 *                         example: '2024-01-31'
 *                   worksiteIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ['507f1f77bcf86cd799439011']
 *                   templateIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   format:
 *                     type: string
 *                     enum: [pdf, excel, csv]
 *                     default: pdf
 *                   includeCharts:
 *                     type: boolean
 *                     default: true
 *                   groupBy:
 *                     type: string
 *                     enum: [worksite, template, user, date]
 *                   filters:
 *                     type: object
 *                     description: Additional filtering criteria
 *               schedule:
 *                 type: object
 *                 description: Optional scheduling for recurring reports
 *                 properties:
 *                   frequency:
 *                     type: string
 *                     enum: [daily, weekly, monthly, quarterly]
 *                   dayOfWeek:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 6
 *                   dayOfMonth:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 31
 *                   time:
 *                     type: string
 *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     example: '09:00'
 *               emailRecipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Email addresses to receive the report
 *     responses:
 *       201:
 *         description: Report generation started
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
 *                     report:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: pending
 *                         estimatedCompletion:
 *                           type: string
 *                           format: date-time
 *                 message:
 *                   type: string
 *                   example: Report generation started
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'

/**
 * @swagger
 * @swagger
 * /reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     description: Retrieve a specific report by ID
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report retrieved successfully
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
 *                     report:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                         status:
 *                           type: string
 *                         parameters:
 *                           type: object
 *                         results:
 *                           type: object
 *                           description: Report data/results
 *                         downloadUrl:
 *                           type: string
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete report
 *     description: Delete a report and its associated files
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted successfully
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
 *                   example: Report deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'

/**
 * @swagger
 * @swagger
 * /reports/{id}/download:
 *   get:
 *     summary: Download report file
 *     description: Download the generated report file
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Report not found or not yet generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'

/**
 * @swagger
 * @swagger
 * /reports/templates:
 *   get:
 *     summary: Get report templates
 *     description: Retrieve available report templates and configurations
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Report templates retrieved successfully
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
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [summary, detailed, analytics, compliance]
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           availableFormats:
 *                             type: array
 *                             items:
 *                               type: string
 *                               enum: [pdf, excel, csv]
 *                           parameters:
 *                             type: object
 *                             description: Available parameters for this template
 *                           examples:
 *                             type: array
 *                             items:
 *                               type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'

/**
 * @swagger
 * @swagger
 * /reports/analytics/summary:
 *   get:
 *     summary: Get reports analytics summary
 *     description: Get summary analytics about report generation and usage
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Reports analytics retrieved successfully
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
 *                     totalReports:
 *                       type: integer
 *                       example: 156
 *                     reportsThisPeriod:
 *                       type: integer
 *                       example: 23
 *                     averageGenerationTime:
 *                       type: number
 *                       example: 12.5
 *                       description: Average generation time in seconds
 *                     reportsByType:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: integer
 *                         detailed:
 *                           type: integer
 *                         analytics:
 *                           type: integer
 *                         compliance:
 *                           type: integer
 *                     popularFormats:
 *                       type: object
 *                       properties:
 *                         pdf:
 *                           type: integer
 *                         excel:
 *                           type: integer
 *                         csv:
 *                           type: integer
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
