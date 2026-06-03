# Security Policy

## Supported Versions

We release security updates for the following versions of State.js:

| Version | Supported          |
| ------- | ------------------ |
| 1.4.x   | :white_check_mark: |
| 1.3.x   | :white_check_mark: |
| 1.2.x   | :x:                |
| < 1.2   | :x:                |

## Reporting a Vulnerability

We take the security of State.js seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email security details to: [Your security email here]
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability within 7 days
- **Updates**: We will keep you informed of progress
- **Fix Timeline**: Critical vulnerabilities will be patched within 14 days
- **Credit**: You will be credited in the release notes (if desired)

## Security Best Practices

### HTML Includes

State.js v1.4.2+ has **secure defaults** for HTML includes:

**✅ Safe by Default:**
```html
<!-- Template-based includes always work -->
<div data-state-include="#my-template"></div>
```

**⚠️ Requires Opt-In:**
```javascript
// External file fetches require explicit enablement
state.allowExternalIncludes = true;
```

**Only enable external includes when:**
- Fetching from **HTTPS endpoints only**
- Fetching from **same-origin or trusted domains**
- Your build/deployment pipeline is **secure**
- You have **Content Security Policy headers** configured

### Recommended CSP Headers

Add these headers to your server configuration:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

For stricter security with DOMPurify:
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; require-trusted-types-for 'script'
```

### DOMPurify Integration

For applications that must fetch external HTML, we **strongly recommend** using DOMPurify:

```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
<script src="state.js"></script>
<script>
  // DOMPurify will be auto-detected and used
  state.allowExternalIncludes = true;
</script>
```

State.js will automatically use DOMPurify if it's available in the global scope.

## Known Attack Vectors

### DOM-based XSS (Mitigated in v1.4.2+)

**Risk**: External HTML includes could execute malicious JavaScript if the source is compromised.

**Mitigation**:
- External fetches disabled by default
- Template-based includes recommended
- DOMPurify auto-integration
- CSP headers recommended

**Attack Examples**:
```html
<!-- ❌ UNSAFE: User-controlled URL -->
<div data-state-include="${userInput}"></div>

<!-- ❌ UNSAFE: HTTP endpoint -->
<div data-state-include="http://example.com/component.html"></div>

<!-- ✅ SAFE: Template reference -->
<div data-state-include="#trusted-template"></div>

<!-- ⚠️ SAFER: HTTPS + same-origin + DOMPurify -->
<div data-state-include="https://myapp.com/components/card.html"></div>
```

### CSP Violations (Fixed in v1.4.1)

**Risk**: Previous versions used `eval()` which violated strict CSP policies.

**Mitigation**:
- v1.4.1+ uses custom expression parser instead of `eval()`
- All dynamic code execution is safe
- No CSP violations

## Security Changelog

### v1.4.2 (Current)
- 🔒 **External includes disabled by default**
- ✅ Added opt-in flag for external fetches
- ✅ DOMPurify auto-integration
- ✅ Security warnings in console

### v1.4.1
- 🔒 **Removed all `eval()` usage**
- ✅ CSP-compliant expression parser
- ✅ Safe condition evaluation

### v1.4.0
- ⚠️ No security-specific changes

### v1.3.x and earlier
- ⚠️ External includes were enabled by default (XSS risk)
- ⚠️ Used `eval()` for expressions (CSP violations)
- 🚨 **Upgrade recommended**

## Responsible Disclosure

We follow responsible disclosure practices:

1. We will work with you to understand and validate the vulnerability
2. We will develop and test a fix
3. We will release a security patch
4. We will publicly disclose the vulnerability after the patch is released
5. We will credit you in the release notes (if you wish)

Thank you for helping keep State.js secure!
