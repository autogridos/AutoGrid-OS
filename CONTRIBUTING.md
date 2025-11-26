# Contributing to AutoGrid OS

Thank you for your interest in contributing to AutoGrid OS! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/autogrid-os.git
   cd autogrid-os
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/autogrid/autogrid-os.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

### Development Workflow

```bash
# Start development mode with watch
npm run dev

# Run tests in watch mode
npm test -- --watch
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-new-adapter` - New features
- `fix/payment-validation` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/cleanup-types` - Code refactoring

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(payment): add batch payment support
fix(marketplace): resolve bid calculation error
docs(readme): update installation instructions
```

## Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make your changes** and commit them

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

5. **Open a Pull Request** on GitHub

### PR Requirements

- [ ] All tests pass
- [ ] Linter passes with no errors
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated
- [ ] Descriptive PR title and description

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Prefer interfaces over types for object shapes
- Use proper typing - avoid `any`
- Document public APIs with JSDoc comments

```typescript
/**
 * Send payment to another device
 * @param params - Payment parameters
 * @returns The created payment object
 * @throws Error if insufficient balance
 */
async sendPayment(params: PaymentParams): Promise<Payment> {
  // implementation
}
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line arrays/objects
- Keep lines under 100 characters
- Use meaningful variable names

### File Organization

```
src/
├── core/           # Core SDK classes
├── modules/        # Feature modules
├── adapters/       # Robot/device adapters
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── index.ts        # Main entry point
```

## Testing

### Writing Tests

- Place tests in `tests/` directory
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

```typescript
describe('PaymentModule', () => {
  describe('send', () => {
    it('should create payment with correct amount', async () => {
      // test implementation
    });

    it('should throw error for insufficient balance', async () => {
      // test implementation
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- PaymentModule.test.ts

# Run with coverage
npm test -- --coverage
```

## Adding New Features

### New Module

1. Create file in `src/modules/YourModule.ts`
2. Export from `src/index.ts`
3. Add tests in `tests/YourModule.test.ts`
4. Document in `docs/API.md`
5. Add example in `examples/`

### New Adapter

1. Create file in `src/adapters/YourAdapter.ts`
2. Follow existing adapter patterns
3. Implement required interfaces
4. Add comprehensive tests
5. Add usage example

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase

Thank you for contributing! 🤖
