# Contributing to TiloPOS

First off, thank you for considering contributing to TiloPOS! It's people like you that make TiloPOS such a great tool for UMKM Indonesia.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js 20+** (LTS version)
- **PostgreSQL 15+**
- **Redis 7+**
- **Git**
- **Docker** (optional but recommended)

### Quick Setup

1. **Fork the repository**
   - Click the "Fork" button at the top right of the repository page

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/tilopos.git
   cd tilopos
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/omanjaya/tilopos.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Setup environment**
   ```bash
   cd packages/backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Run migrations and seed**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

7. **Start development servers**
   ```bash
   # Terminal 1: Backend
   npm run dev

   # Terminal 2: Frontend
   npm run dev:web
   ```

---

## Development Setup

### Using Docker (Recommended)

```bash
# Start all services
npm run docker:dev

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3001
# - API Docs: http://localhost:3001/api/docs
```

### Project Structure

```
tilopos/
├── packages/
│   ├── backend/        # NestJS backend
│   └── web/            # React frontend
├── Docs/               # Documentation
├── .github/            # GitHub templates & workflows
└── docker-compose*.yml # Docker configurations
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new features
   - Update documentation if needed

3. **Run tests**
   ```bash
   # Backend tests
   cd packages/backend
   npm run test
   npm run test:e2e

   # Frontend tests
   cd packages/web
   npm run test
   npm run test:e2e
   ```

4. **Run linting**
   ```bash
   npm run lint
   ```

5. **Commit your changes**
   - Follow our [commit guidelines](#commit-guidelines)

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch

---

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

#### 🐛 Bug Fixes
- Found a bug? Please report it!
- Want to fix it? Even better!

#### ✨ New Features
- Have an idea? Open a feature request
- Want to implement it? Discuss first, then code

#### 📝 Documentation
- Improve README, guides, or code comments
- Add examples or tutorials

#### 🧪 Tests
- Add missing test coverage
- Improve existing tests

#### 🎨 UI/UX Improvements
- Design improvements
- Accessibility enhancements
- Performance optimizations

#### 🌍 Translations
- Add or improve translations (future)

---

## Coding Standards

### General Principles

1. **KISS** - Keep It Simple, Stupid
2. **DRY** - Don't Repeat Yourself
3. **SOLID** - Follow SOLID principles
4. **Single Responsibility** - One purpose per file/function

### TypeScript

- **Strict Mode** - Always use TypeScript strict mode
- **No `any`** - Avoid using `any` type
- **Explicit Types** - Always specify return types
- **Interfaces over Types** - Use interfaces for objects

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### Naming Conventions

- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions**: camelCase (e.g., `getUser`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Booleans**: Prefix with `is`, `has`, `can` (e.g., `isActive`)

### Code Organization

#### Backend (NestJS)

```typescript
// ✅ Good - Clean, organized
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

#### Frontend (React)

```typescript
// ✅ Good - Clear, simple
export function UserProfile({ userId }: UserProfileProps) {
  const { data: user, isLoading } = useUser(userId);

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <UserNotFound />;

  return <div>{user.name}</div>;
}
```

### Comments

- **Write self-documenting code** - Code should be clear without comments
- **Comment "why", not "what"** - Explain reasoning, not obvious operations
- **Keep comments up-to-date** - Outdated comments are worse than no comments

```typescript
// ❌ Bad - Obvious comment
// Increment counter by 1
counter++;

// ✅ Good - Explains reasoning
// Use exponential backoff to avoid overwhelming the API
// during retry attempts after rate limiting
await delay(Math.pow(2, retryCount) * 1000);
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Add or update tests
- **build**: Build system changes
- **ci**: CI/CD changes
- **chore**: Other changes (dependencies, etc.)

### Examples

```bash
# Feature
feat(pos): add split bill functionality

# Bug fix
fix(kds): resolve order timer display issue

# Documentation
docs: update installation guide with Docker steps

# Refactor
refactor(inventory): simplify stock calculation logic

# Multiple changes
feat(reports): add export to Excel feature

- Implement ExcelJS integration
- Add export button to reports page
- Update tests for export functionality

Closes #123
```

### Commit Message Rules

1. **Subject line**:
   - Use imperative mood ("add" not "added")
   - No period at the end
   - Maximum 72 characters
   - Lowercase after type

2. **Body** (optional):
   - Separate from subject with blank line
   - Wrap at 72 characters
   - Explain what and why, not how

3. **Footer** (optional):
   - Reference issues: `Closes #123`, `Fixes #456`
   - Breaking changes: `BREAKING CHANGE: description`

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project coding standards
- [ ] All tests pass locally
- [ ] Linting passes without errors
- [ ] New code has adequate test coverage
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow guidelines

### PR Title

Use the same format as commit messages:

```
feat(module): add new feature
fix(component): resolve specific issue
```

### PR Description

Use our PR template (auto-filled). Include:

1. **What** - What changes does this PR make?
2. **Why** - Why are these changes needed?
3. **How** - How were these changes implemented?
4. **Testing** - How was this tested?
5. **Screenshots** - For UI changes (if applicable)
6. **Related Issues** - Link to related issues

### Review Process

1. **Automated Checks** - CI must pass (tests, linting)
2. **Code Review** - At least one maintainer approval required
3. **Discussion** - Address feedback and make changes
4. **Approval** - Once approved, we'll merge your PR

### After Merge

- Your PR will be merged to `main` branch
- Changes will be included in next release
- You'll be credited in release notes! 🎉

---

## Reporting Bugs

### Before Reporting

- Check if the bug has already been reported
- Verify you're using the latest version
- Try to reproduce the bug

### Bug Report Template

Use our bug report template on GitHub Issues. Include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - How to reproduce the issue
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, Node version, browser, etc.
6. **Screenshots** - If applicable
7. **Logs** - Error messages or stack traces

---

## Suggesting Enhancements

### Feature Request Template

Use our feature request template on GitHub Issues. Include:

1. **Problem** - What problem does this solve?
2. **Solution** - Describe your proposed solution
3. **Alternatives** - Other solutions you've considered
4. **Additional Context** - Screenshots, mockups, etc.

### Enhancement Guidelines

- **Align with project goals** - Feature should benefit UMKM users
- **Keep it simple** - Avoid over-engineering
- **Consider maintenance** - Is this sustainable long-term?
- **Check existing features** - Avoid duplication

---

## Community

### Getting Help

- **Documentation** - Check [README](./README.md) and [Docs](./Docs/)
- **GitHub Issues** - Search existing issues
- **Discussions** - Use GitHub Discussions for questions

### Stay Updated

- **Watch** the repository for notifications
- **Star** the repository to show support
- **Follow** project updates in releases

### Recognition

Contributors will be:
- Listed in release notes
- Credited in CHANGELOG.md
- Recognized in our contributors list

---

## Questions?

Don't hesitate to ask! Open a GitHub Discussion or Issue, and we'll be happy to help.

**Thank you for contributing to TiloPOS!** 🎉

---

<div align="center">

Made with ❤️ for UMKM Indonesia

</div>
