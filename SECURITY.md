# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it by:

1. Opening a [GitHub Security Advisory](../../security/advisories/new) (preferred)
2. Or emailing the maintainers directly (see the repository's contact information)

Please include in your report:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested fixes or mitigations

You can expect an acknowledgement within **48 hours** and a resolution timeline within **7 days** for critical issues.

## Security Considerations

This application is designed for **trusted networks or personal use**. Key points to understand before deploying publicly:

- **No authentication**: Shopping lists are accessible to anyone who knows the UUID. The UUIDs are not guessable, but there is no access control layer.
- **No rate limiting**: The API does not rate-limit requests out of the box.
- **List expiration**: Lists auto-expire based on `LIST_RETENTION_DAYS` (default: 30 days).

For production deployments, consider placing the application behind a reverse proxy (e.g., nginx) with:
- HTTPS/TLS termination
- Rate limiting
- IP allowlisting if appropriate for your use case

## Dependency Updates

Dependencies are tracked and should be kept up to date. If you discover a known CVE in a dependency, please open an issue or submit a pull request with the fix.
