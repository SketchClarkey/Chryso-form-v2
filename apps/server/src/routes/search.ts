import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import SearchService from '../services/searchService';

const router = Router();
const searchService = SearchService.getInstance();

// Validation middleware
const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Query must be between 1 and 200 characters'),
  query('types')
    .optional()
    .isString()
    .custom((value) => {
      if (value) {
        const validTypes = ['form', 'template', 'user', 'worksite', 'dashboard'];
        const types = value.split(',').map((t: string) => t.trim());
        return types.every((type: string) => validTypes.includes(type));
      }
      return true;
    })
    .withMessage('Invalid search types'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'date', 'name'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order'),
];

const suggestionValidation = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Query must be between 2 and 100 characters'),
];

// GET /api/search - Global search across all entities
router.get('/', authenticate, searchValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      q: query,
      types,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      status,
      category,
      dateFrom,
      dateTo,
      createdBy,
      tags,
    } = req.query;

    // Parse filters
    const filters: any = {};
    if (status) {
      filters.status = (status as string).split(',').map(s => s.trim());
    }
    if (category) {
      filters.category = (category as string).split(',').map(c => c.trim());
    }
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }
    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }
    if (createdBy) {
      filters.createdBy = createdBy as string;
    }
    if (tags) {
      filters.tags = (tags as string).split(',').map(t => t.trim());
    }

    const searchOptions = {
      query: query as string,
      types: types ? (types as string).split(',').map(t => t.trim()) : undefined,
      limit: Number(limit),
      offset: Number(offset),
      sortBy: sortBy as 'relevance' | 'date' | 'name',
      sortOrder: sortOrder as 'asc' | 'desc',
      filters,
    };

    const results = await searchService.globalSearch(
      searchOptions,
      req.user.role,
      req.user.id
    );

    res.json({
      success: true,
      data: {
        query: query,
        results: results.results,
        total: results.total,
        facets: results.facets,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: results.total > Number(offset) + Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
    });
  }
});

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', authenticate, suggestionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { q: query } = req.query;

    const suggestions = await searchService.getSearchSuggestions(
      query as string,
      req.user.role,
      req.user.id
    );

    res.json({
      success: true,
      data: {
        query: query,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search suggestions',
    });
  }
});

// GET /api/search/recent - Get recent searches for the user
router.get('/recent', authenticate, async (req, res) => {
  try {
    // This would typically be stored in a user preferences or search history collection
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: {
        recentSearches: [],
      },
    });
  } catch (error) {
    console.error('Recent searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent searches',
    });
  }
});

// GET /api/search/popular - Get popular search terms
router.get('/popular', authenticate, async (req, res) => {
  try {
    // This would typically be calculated from search analytics
    // For now, return static popular terms as placeholder
    const popularTerms = [
      { term: 'inspection', count: 245 },
      { term: 'maintenance', count: 189 },
      { term: 'safety', count: 167 },
      { term: 'completed', count: 156 },
      { term: 'urgent', count: 134 },
    ];

    res.json({
      success: true,
      data: {
        popularTerms,
      },
    });
  } catch (error) {
    console.error('Popular searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches',
    });
  }
});

export default router;