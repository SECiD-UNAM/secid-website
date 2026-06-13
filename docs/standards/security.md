# Security Implementation Guide for SECiD Platform

This document outlines the comprehensive security implementation for the SECiD (Sociedad de Egresados en Ciencia de Datos) platform, including security headers, input validation, rate limiting, Firebase security rules, session management, and CAPTCHA integration.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Security Headers](#security-headers)
3. [Input Validation](#input-validation)
4. [Rate Limiting](#rate-limiting)
5. [Firebase Security Rules](#firebase-security-rules)
6. [Session Management](#session-management)
7. [CAPTCHA Integration](#captcha-integration)
8. [Configuration](#configuration)
9. [Development Setup](#development-setup)
10. [Production Deployment](#production-deployment)
11. [Security Best Practices](#security-best-practices)
12. [Troubleshooting](#troubleshooting)

## Security Overview

The SECiD platform implements a multi-layered security approach:

- **Perimeter Security**: Security headers, CORS, CSP
- **Input Security**: Comprehensive validation and sanitization
- **Access Control**: Role-based access control (RBAC) with Firebase
- **Rate Limiting**: DDoS protection and abuse prevention
- **Session Security**: Secure session management with timeout and rotation
- **Bot Protection**: CAPTCHA integration for forms and sensitive actions

## Security Headers

### Implementation

Security headers are implemented via middleware in `/src/middleware/security.ts`:

```typescript
import { createEnvironmentSecurityMiddleware } from './src/middleware/security';
```

### Headers Implemented

1. **Content Security Policy (CSP)**
   - Prevents XSS attacks
   - Restricts resource loading to trusted sources
   - Environment-specific configurations

2. **HTTP Strict Transport Security (HSTS)**
   - Forces HTTPS connections
   - Includes subdomains and preload
   - 2-year max-age in production

3. **X-Frame-Options**
   - Prevents clickjacking attacks
   - Set to DENY by default

4. **X-Content-Type-Options**
   - Prevents MIME-type sniffing
   - Set to nosniff

5. **Referrer Policy**
   - Controls referrer information
   - Set to strict-origin-when-cross-origin

6. **Permissions Policy**
   - Restricts browser features
   - Camera, microphone disabled by default

### Configuration

Edit `/src/middleware/security.ts` to customize security headers:

```typescript
const productionSecurityConfig = {
  csp: {
    scriptSrc: [
      "'self'",
      'https://cdn.amplitude.com',
      'https://www.google.com',
      // Add your trusted sources here
    ],
  },
};
```

## Input Validation

### Zod Schemas

All form inputs are validated using Zod schemas located in `/src/lib/validation/`:

- `user-schemas.ts` - User registration, login, profile updates
- `job-schemas.ts` - Job posting and application validation
- `event-schemas.ts` - Event creation and registration
- `profile-schemas.ts` - Profile management validation

### Example Usage

```typescript
import { UserRegistrationSchema } from '/src/lib/validation';

const result = UserRegistrationSchema.safeParse(formData);
if (!result.success) {
  console.error('Validation errors:', result.error.issues);
}
```

### Sanitization

Input sanitization is handled by `/src/lib/validation/sanitization.ts`:

```typescript
import { sanitizeHtml, sanitizeText } from '/src/lib/validation/sanitization';

const cleanHtml = sanitizeHtml(userInput);
const cleanText = sanitizeText(userInput, { maxLength: 500 });
```

### Server-Side Validation

Always validate on the server side:

```typescript
import { validateServerInput } from '/src/lib/validation/validation-utils';

const validation = validateServerInput(schema, requestData, {
  stripUnknown: true,
  maxDepth: 10,
});
```

## Rate Limiting

### Implementation

Rate limiting is implemented in `/src/lib/rate-limiter.ts` with multiple presets:

```typescript
import { RateLimiter, RateLimitPresets } from '/src/lib/rate-limiter';

const rateLimiter = new RateLimiter();
```

### Rate Limit Presets

- **API**: 100 requests/minute
- **Authentication**: 5 attempts/15 minutes
- **Password Reset**: 3 attempts/hour
- **Contact Form**: 2 submissions/5 minutes
- **Job Posting**: 5 posts/hour
- **Registration**: 3 attempts/hour
- **Search**: 30 requests/minute
- **File Upload**: 10 uploads/5 minutes
- **DDoS Protection**: 50 requests/10 seconds

### CAPTCHA Integration

Rate limiting includes CAPTCHA integration for enhanced security:

```typescript
const result = await rateLimiter.checkLimit(key, config, captchaToken);
if (result.captchaRequired) {
  // Show CAPTCHA to user
}
```

### Custom Rate Limits

Create custom rate limits for specific endpoints:

```typescript
const customLimit = {
  windowMs: 300000, // 5 minutes
  maxRequests: 10,
  enableCaptcha: true,
  captchaThreshold: 5,
};
```

## Firebase Security Rules

### Enhanced RBAC

Security rules are implemented in `firestore.rules` with comprehensive role-based access control:

```javascript
function hasRole(role) {
  return getUserRole() == role;
}

function canModerate() {
  return hasAnyRole(['admin', 'moderator']);
}
```

### Key Features

1. **Helper Functions**: Reusable security functions
2. **Data Validation**: Field-level validation rules
3. **Ownership Checks**: Resource ownership verification
4. **Role-Based Access**: Admin, moderator, member roles
5. **Audit Logging**: Activity tracking for sensitive operations

### Collection Security

- **Users**: Self-management with admin oversight
- **Jobs**: Verified users can post, admins can moderate
- **Events**: Moderators can create, users can register
- **Forums**: Content moderation and spam prevention
- **Mentorship**: Privacy-focused access control

### Validation Rules

```javascript
function validateUserData() {
  return request.resource.data.keys().hasAll(['email', 'firstName', 'lastName']) &&
         request.resource.data.email is string &&
         request.resource.data.firstName.size() > 0;
}
```

## Session Management

### Features

Session management is implemented in `/src/lib/session-manager.ts`:

- Secure session creation and validation
- Session timeout and rotation
- Concurrent session limiting
- Device fingerprinting
- Security violation detection
- Reauth requirements for sensitive actions

### Configuration

```typescript
const sessionConfig = {
  sessionTimeout: 3600000, // 1 hour
  maxConcurrentSessions: 3,
  enableSessionRotation: true,
  rotationInterval: 1800000, // 30 minutes
  requireReauthForSensitive: true,
};
```

### Usage

```typescript
import { SessionManager } from '/src/lib/session-manager';

const sessionManager = new SessionManager();

// Create session
const session = await sessionManager.createSession(user, request);

// Validate session
const validation = await sessionManager.validateSession(sessionId, request);
```

### Security Features

1. **IP Address Validation**: Detects session hijacking
2. **User Agent Checking**: Prevents session theft
3. **Activity Tracking**: Logs all session activities
4. **Automatic Cleanup**: Removes expired sessions
5. **Concurrent Limits**: Prevents session abuse

## CAPTCHA Integration

### Supported Providers

CAPTCHA integration in `/src/lib/captcha.ts` supports:

- Google reCAPTCHA v2
- Google reCAPTCHA v3
- hCaptcha
- Cloudflare Turnstile

### Configuration

```typescript
const captchaConfig = {
  provider: 'recaptcha-v3',
  siteKey: 'your-site-key',
  secretKey: 'your-secret-key',
  threshold: 0.5,
  enabledForActions: ['login', 'register', 'contact'],
};
```

### Implementation

```typescript
import { CaptchaManager } from '/src/lib/captcha';

const captchaManager = new CaptchaManager(config);

// Verify CAPTCHA
const result = await captchaManager.verify(token, action, clientIP);
```

### Action-Based CAPTCHA

Different actions can have different CAPTCHA requirements:

- **Registration**: Always required
- **Login**: Required after failed attempts
- **Contact Forms**: Always required
- **Job Posting**: Required for new users
- **Password Reset**: Always required

## Configuration

### Environment Variables

Create a `.env` file with required security configuration:

```env
# Session Security
SESSION_SECRET=your-session-secret-key

# CAPTCHA Configuration
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# JWT Security
JWT_SECRET=your-jwt-secret-key

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Security Manager

Use the centralized security manager:

```typescript
import { createSecurityManagerFromEnv } from '/src/lib/security-config';

const securityManager = createSecurityManagerFromEnv();
```

### Environment-Specific Settings

The platform supports different security levels:

- **Development**: Relaxed settings for development
- **Staging**: Production-like settings for testing
- **Production**: Maximum security settings

## Development Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set Up Firebase**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use your-project-id
   ```

4. **Deploy Security Rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables are set
- [ ] Security secrets are generated and secure
- [ ] Firebase security rules are deployed
- [ ] HTTPS is enabled
- [ ] CSP headers are configured for production domains
- [ ] Rate limiting is enabled
- [ ] CAPTCHA is configured and tested
- [ ] Session management is configured
- [ ] Security monitoring is set up

### Deployment Steps

1. **Build Production Assets**

   ```bash
   npm run build
   ```

2. **Deploy Firebase Rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Deploy Application**

   ```bash
   npm run deploy
   ```

4. **Verify Security Headers**
   Test with tools like:
   - [Security Headers](https://securityheaders.com/)
   - [Mozilla Observatory](https://observatory.mozilla.org/)

## Security Best Practices

### General Guidelines

1. **Keep Dependencies Updated**
   - Regularly update all npm packages
   - Monitor security advisories
   - Use `npm audit` to check vulnerabilities

2. **Secure Secrets Management**
   - Never commit secrets to version control
   - Use environment variables
   - Rotate secrets regularly

3. **Input Validation**
   - Validate all inputs on both client and server
   - Sanitize HTML content
   - Use parameterized queries

4. **Authentication & Authorization**
   - Implement proper role-based access control
   - Use secure session management
   - Require re-authentication for sensitive actions

5. **Monitoring & Logging**
   - Log security events
   - Monitor for unusual activity
   - Set up alerts for security violations

### Code Security

1. **Avoid Common Vulnerabilities**
   - XSS: Use CSP and input sanitization
   - CSRF: Use CSRF tokens and SameSite cookies
   - SQL Injection: Use parameterized queries
   - Path Traversal: Validate file paths

2. **Secure API Design**
   - Use HTTPS only
   - Implement rate limiting
   - Validate all inputs
   - Use proper error handling

3. **Frontend Security**
   - Minimize inline scripts
   - Use Content Security Policy
   - Validate user inputs
   - Secure local storage usage

## Troubleshooting

### Common Issues

1. **CSP Violations**
   - Check browser console for CSP errors
   - Update CSP directives in security middleware
   - Ensure all resources are from allowed origins

2. **Rate Limiting Issues**
   - Check rate limit headers in response
   - Verify client IP detection
   - Adjust rate limit thresholds if needed

3. **CAPTCHA Failures**
   - Verify site key and secret key
   - Check network connectivity
   - Ensure correct action names

4. **Session Problems**
   - Check session timeout settings
   - Verify cookie settings
   - Check for session conflicts

5. **Firebase Rules Errors**
   - Test rules in Firebase console
   - Check user roles and permissions
   - Verify data structure matches rules

### Debug Mode

Enable debug logging:

```typescript
const securityManager = new SecurityManager({
  // ... other config
  logging: {
    level: 'debug',
    logFailedAttempts: true,
    logSuccessfulActions: true,
  },
});
```

### Testing Security

1. **Security Headers Testing**

   ```bash
   curl -I https://your-domain.com
   ```

2. **Rate Limiting Testing**

   ```bash
   # Test rate limits
   for i in {1..10}; do curl https://your-domain.com/api/endpoint; done
   ```

3. **CAPTCHA Testing**
   - Use browser developer tools
   - Test with invalid tokens
   - Verify score thresholds

### Support

For security-related issues:

1. Check this documentation first
2. Review security logs
3. Test in development environment
4. Contact the development team

## Security Updates

This security implementation should be regularly reviewed and updated:

- Monthly dependency updates
- Quarterly security rule reviews
- Annual security audits
- Immediate updates for critical vulnerabilities

Remember: Security is an ongoing process, not a one-time implementation.
