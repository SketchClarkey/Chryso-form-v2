/**
 * @swagger
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     description: Retrieve key metrics and analytics for the dashboard
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: month
 *         description: Time period for analytics
 *       - in: query
 *         name: worksiteId
 *         schema:
 *           type: string
 *         description: Filter by specific worksite
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalForms:
 *                           type: integer
 *                           example: 1250
 *                         completedForms:
 *                           type: integer
 *                           example: 980
 *                         pendingReview:
 *                           type: integer
 *                           example: 45
 *                         activeUsers:
 *                           type: integer
 *                           example: 23
 *                         activeWorksites:
 *                           type: integer
 *                           example: 8
 *                     trends:
 *                       type: object
 *                       properties:
 *                         formsSubmitted:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               count:
 *                                 type: integer
 *                         completionRate:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               rate:
 *                                 type: number
 *                                 minimum: 0
 *                                 maximum: 100
 *                     performance:
 *                       type: object
 *                       properties:
 *                         averageCompletionTime:
 *                           type: number
 *                           description: Average time in minutes
 *                           example: 15.5
 *                         formsByStatus:
 *                           type: object
 *                           properties:
 *                             draft:
 *                               type: integer
 *                             in_progress:
 *                               type: integer
 *                             pending_review:
 *                               type: integer
 *                             approved:
 *                               type: integer
 *                             completed:
 *                               type: integer
 *                         topTemplates:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               templateId:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               usage:
 *                                 type: integer
 *                         worksiteActivity:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               worksiteId:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               formCount:
 *                                 type: integer
 *                               lastActivity:
 *                                 type: string
 *                                 format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * @swagger
 * /analytics/forms:
 *   get:
 *     summary: Get form analytics
 *     description: Retrieve detailed analytics about form usage and performance
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: month
 *       - in: query
 *         name: templateId
 *         schema:
 *           type: string
 *         description: Filter by specific template
 *       - in: query
 *         name: worksiteId
 *         schema:
 *           type: string
 *         description: Filter by specific worksite
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [template, worksite, user, status]
 *           default: template
 *     responses:
 *       200:
 *         description: Form analytics retrieved successfully
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalForms:
 *                           type: integer
 *                         avgCompletionTime:
 *                           type: number
 *                         completionRate:
 *                           type: number
 *                         abandonmentRate:
 *                           type: number
 *                     distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           created:
 *                             type: integer
 *                           completed:
 *                             type: integer
 *                           approved:
 *                             type: integer
 *                     fieldAnalytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fieldId:
 *                             type: string
 *                           fieldName:
 *                             type: string
 *                           completionRate:
 *                             type: number
 *                           avgTimeSpent:
 *                             type: number
 *                           errorRate:
 *                             type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'

/**
 * @swagger
 * @swagger
 * /analytics/users:
 *   get:
 *     summary: Get user analytics
 *     description: Retrieve analytics about user activity and performance
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: month
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, technician]
 *         description: Filter by user role
 *       - in: query
 *         name: worksiteId
 *         schema:
 *           type: string
 *         description: Filter by specific worksite
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         newUsers:
 *                           type: integer
 *                         avgFormsPerUser:
 *                           type: number
 *                     activity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           activeUsers:
 *                             type: integer
 *                           formsCreated:
 *                             type: integer
 *                           formsCompleted:
 *                             type: integer
 *                     topUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           formsCompleted:
 *                             type: integer
 *                           avgCompletionTime:
 *                             type: number
 *                           role:
 *                             type: string
 *                     roleDistribution:
 *                       type: object
 *                       properties:
 *                         admin:
 *                           type: integer
 *                         manager:
 *                           type: integer
 *                         technician:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /analytics/worksites:
 *   get:
 *     summary: Get worksite analytics
 *     description: Retrieve analytics about worksite activity and performance
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *           default: month
 *       - in: query
 *         name: worksiteId
 *         schema:
 *           type: string
 *         description: Analyze specific worksite only
 *     responses:
 *       200:
 *         description: Worksite analytics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalWorksites:
 *                           type: integer
 *                         activeWorksites:
 *                           type: integer
 *                         avgFormsPerWorksite:
 *                           type: number
 *                     performance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           worksiteId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           totalForms:
 *                             type: integer
 *                           completedForms:
 *                             type: integer
 *                           completionRate:
 *                             type: number
 *                           avgCompletionTime:
 *                             type: number
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                           activeUsers:
 *                             type: integer
 *                     activity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           worksiteActivity:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 worksiteId:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 formCount:
 *                                   type: integer
 *                     compliance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           worksiteId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           complianceScore:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 100
 *                           overdueforms:
 *                             type: integer
 *                           completedOnTime:
 *                             type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'

/**
 * @swagger
 * @swagger
 * /analytics/custom:
 *   post:
 *     summary: Generate custom analytics
 *     description: Generate custom analytics based on specific criteria
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metrics
 *               - dateRange
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [form_count, completion_rate, avg_time, user_activity, worksite_performance]
 *                 example: [form_count, completion_rate]
 *               dateRange:
 *                 type: object
 *                 required:
 *                   - start
 *                   - end
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date
 *                   end:
 *                     type: string
 *                     format: date
 *               filters:
 *                 type: object
 *                 properties:
 *                   worksiteIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   templateIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   userIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [admin, manager, technician]
 *                   statuses:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [draft, in_progress, pending_review, approved, completed, cancelled]
 *               groupBy:
 *                 type: string
 *                 enum: [day, week, month, worksite, template, user]
 *                 default: day
 *               aggregation:
 *                 type: string
 *                 enum: [sum, avg, count, min, max]
 *                 default: sum
 *     responses:
 *       200:
 *         description: Custom analytics generated successfully
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
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           metrics:
 *                             type: object
 *                             additionalProperties:
 *                               type: number
 *                     summary:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         totalRecords:
 *                           type: integer
 *                         queryTime:
 *                           type: number
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'

/**
 * @swagger
 * @swagger
 * /analytics/export:
 *   post:
 *     summary: Export analytics data
 *     description: Export analytics data in various formats
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - format
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [dashboard, forms, users, worksites, custom]
 *               format:
 *                 type: string
 *                 enum: [csv, excel, json]
 *               parameters:
 *                 type: object
 *                 description: Parameters specific to the analytics type
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date
 *                   end:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Analytics export file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */