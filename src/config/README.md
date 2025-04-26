# Configuration Structure

This directory contains all application-wide configurations and settings. It follows a modular and type-safe approach to configuration management.

## Directory Structure

```
src/config/
├── types/          # TypeScript interfaces and types
├── constants/      # Application constants and enums
├── security/       # Security-related configurations
├── auth/           # Authentication settings
├── pwa/            # Progressive Web App configurations
├── environment.ts  # Environment variable validation
└── index.ts        # Main configuration exports
```

## Configuration Modules

### Types (`types/`)
Contains TypeScript interfaces and types for all configurations. This ensures type safety across the application.

### Constants (`constants/`)
Application-wide constants and enums. Each domain (e.g., souk, user) has its own file.

### Security (`security/`)
Security-related configurations including:
- Content Security Policy (CSP)
- Security headers
- CORS settings

### Authentication (`auth/`)
Authentication settings including:
- Session management
- JWT configuration
- Token expiration

### PWA (`pwa/`)
Progressive Web App configurations including:
- Service worker settings
- Cache strategies
- Offline support

### Environment (`environment.ts`)
Environment variable validation using Zod. Ensures all required environment variables are present and valid.

## Usage

```typescript
// Import specific configurations
import { AUTH_CONFIG } from '@/config/auth';
import { SECURITY_CONFIG } from '@/config/security';

// Import all configurations
import { config } from '@/config';

// Create Next.js configuration
import { createNextConfig } from '@/config';
```

## Best Practices

1. **Type Safety**: Always use TypeScript interfaces for configurations
2. **Validation**: Validate environment variables using Zod
3. **Documentation**: Document all configurations and their purposes
4. **Modularity**: Keep configurations modular and domain-specific
5. **Constants**: Use constants for magic numbers and strings
6. **Environment**: Separate public and private configurations 