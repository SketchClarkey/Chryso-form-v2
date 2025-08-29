# Contributing to Chryso Form v2

Thank you for your interest in contributing to Chryso Form v2! This document
provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Be
respectful, inclusive, and collaborative.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/your-username/Chryso-form-v2.git
   cd Chryso-form-v2
   ```

3. **Add the upstream remote**:

   ```bash
   git remote add upstream https://github.com/SketchClarkey/Chryso-form-v2.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.20.0 (use the version specified in `.nvmrc`)
- npm >= 8.0.0
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Install dependencies**:

   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:

   ```bash
   cp apps/server/.env.example apps/server/.env
   # Edit the .env file with your configuration
   ```

3. **Start development servers**:

   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

We use a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Feature development
- `bugfix/bug-name` - Bug fixes
- `hotfix/hotfix-name` - Critical production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
git checkout develop
git pull upstream develop
git checkout feature/your-feature-name
git rebase develop
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Use proper type annotations
- Avoid `any` type unless absolutely necessary

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### File Organization

```text
apps/
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   └── types/          # TypeScript types
│   └── ...
└── server/
    ├── src/
    │   ├── routes/         # API routes
    │   ├── models/         # Database models
    │   ├── middleware/     # Express middleware
    │   ├── services/       # Business logic
    │   ├── utils/          # Utility functions
    │   └── types/          # TypeScript types
    └── ...
```

### Component Guidelines

#### React Components

- Use functional components with hooks
- Use TypeScript for prop types
- Follow the single responsibility principle
- Use meaningful component and prop names

```typescript
interface UserCardProps {
  user: User;
  onEdit: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  // Component implementation
};
```

#### API Routes

- Use proper HTTP status codes
- Implement proper error handling
- Add input validation
- Include comprehensive JSDoc comments

```typescript
/**
 * Get user by ID
 * @route GET /api/users/:id
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getUserById = async (req: Request, res: Response) => {
  // Route implementation
};
```

## Testing Guidelines

### Unit Tests

- Write tests for all new features
- Aim for at least 80% code coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when valid ID is provided', async () => {
      // Arrange
      const userId = 'valid-user-id';

      // Act
      const result = await UserService.getUserById(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });
  });
});
```

### Integration Tests

- Test API endpoints with real database
- Use test database for integration tests
- Clean up test data after each test

### E2E Tests

- Write E2E tests for critical user journeys
- Use Page Object Model pattern
- Keep tests independent and deterministic

### Running Tests

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

### Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or modifying tests
- `chore` - Maintenance tasks

### Examples

```text
feat(auth): add JWT token refresh functionality

fix(forms): resolve validation issue with email field

docs: update API documentation for user endpoints

test(auth): add unit tests for login functionality
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest changes from develop
2. **Run all tests** and ensure they pass
3. **Run linting** and fix any issues
4. **Update documentation** if necessary
5. **Test your changes** thoroughly

### Pull Request Template

When creating a pull request, include:

- **Description** of the changes
- **Testing** performed
- **Screenshots** (if applicable)
- **Breaking changes** (if any)
- **Related issues** (if any)

### Review Process

1. All pull requests require at least one review
2. Address feedback promptly
3. Keep pull requests focused and small
4. Ensure CI checks pass

## Issue Reporting

### Bug Reports

When reporting bugs, include:

- **Environment** (OS, Node version, browser)
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Error messages** or logs

### Feature Requests

When requesting features, include:

- **Use case** description
- **Proposed solution**
- **Alternative solutions** considered
- **Additional context**

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation related
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed

## Development Tools

### Recommended VS Code Extensions

The project includes recommended extensions in `.vscode/extensions.json`.
Install them for the best development experience.

### Database Tools

- MongoDB Compass for database visualization
- Thunder Client for API testing (VS Code extension)

### Debugging

Use the provided VS Code debug configurations:

- **Launch Server** - Debug the backend
- **Launch Client** - Debug the frontend
- **Launch Full Stack** - Debug both simultaneously

## Performance Guidelines

### Frontend

- Use React.memo for expensive components
- Implement proper code splitting
- Optimize images and assets
- Use lazy loading where appropriate

### Backend

- Implement proper database indexing
- Use connection pooling
- Add caching where appropriate
- Monitor memory usage

## Security Guidelines

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication and authorization
- Keep dependencies updated

## Documentation

- Update README.md for significant changes
- Add JSDoc comments for public APIs
- Update API documentation
- Include examples in documentation

## Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Create a release tag
4. Deploy to staging for testing
5. Deploy to production

## Getting Help

- Check existing issues and discussions
- Ask questions in issue comments
- Reach out to maintainers

Thank you for contributing to Chryso Form v2! 🚀
