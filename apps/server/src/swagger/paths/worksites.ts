/**
 * @swagger
 * @swagger
 * /worksites:
 *   get:
 *     summary: Get all worksites
 *     description: Retrieve a paginated list of worksites accessible to the user
 *     tags: [Worksites]
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
 *         description: Number of worksites per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by worksite name or customer name
 *     responses:
 *       200:
 *         description: Worksites retrieved successfully
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
 *                     worksites:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Worksite'
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
 *     summary: Create a new worksite
 *     description: Create a new worksite (admin/manager only)
 *     tags: [Worksites]
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
 *               - customerName
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: Main Treatment Plant
 *               customerName:
 *                 type: string
 *                 example: ABC Water Corp
 *               address:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - zipCode
 *                   - country
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: 123 Industrial Rd
 *                   city:
 *                     type: string
 *                     example: Sydney
 *                   state:
 *                     type: string
 *                     example: NSW
 *                   zipCode:
 *                     type: string
 *                     example: '2000'
 *                   country:
 *                     type: string
 *                     example: Australia
 *               contacts:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Contact'
 *               equipment:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Equipment'
 *     responses:
 *       201:
 *         description: Worksite created successfully
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
 *                     worksite:
 *                       $ref: '#/components/schemas/Worksite'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'

/**
 * @swagger
 * @swagger
 * /worksites/{id}:
 *   get:
 *     summary: Get worksite by ID
 *     description: Retrieve a specific worksite by ID
 *     tags: [Worksites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Worksite ID
 *     responses:
 *       200:
 *         description: Worksite retrieved successfully
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
 *                     worksite:
 *                       $ref: '#/components/schemas/Worksite'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update worksite
 *     description: Update worksite information (admin/manager only)
 *     tags: [Worksites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Worksite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               customerName:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               contacts:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Contact'
 *               equipment:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Equipment'
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Worksite updated successfully
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
 *                     worksite:
 *                       $ref: '#/components/schemas/Worksite'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete worksite
 *     description: Delete a worksite (admin only)
 *     tags: [Worksites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Worksite ID
 *     responses:
 *       200:
 *         description: Worksite deleted successfully
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
 *                   example: Worksite deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'

/**
 * @swagger
 * @swagger
 * /worksites/{id}/contacts:
 *   post:
 *     summary: Add contact to worksite
 *     description: Add a new contact to a worksite
 *     tags: [Worksites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Worksite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contact'
 *     responses:
 *       200:
 *         description: Contact added successfully
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
 *                     worksite:
 *                       $ref: '#/components/schemas/Worksite'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'

/**
 * @swagger
 * @swagger
 * /worksites/{id}/equipment:
 *   post:
 *     summary: Add equipment to worksite
 *     description: Add new equipment to a worksite
 *     tags: [Worksites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Worksite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Equipment'
 *     responses:
 *       200:
 *         description: Equipment added successfully
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
 *                     worksite:
 *                       $ref: '#/components/schemas/Worksite'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */