# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in Nanggroe IoT, please report it responsibly.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by emailing:

**Mulky Malikul Dhaher** — mulkymalikuldhaher@email.com

### What to Include

Please include the following information in your report:

1. **Description** — A clear description of the vulnerability
2. **Impact** — What an attacker could achieve by exploiting this vulnerability
3. **Reproduction Steps** — Step-by-step instructions to reproduce the issue
4. **Affected Versions** — Which versions are affected
5. **Suggested Fix** — If you have ideas for how to fix the issue (optional)
6. **Your Contact** — How we can reach you for follow-up questions

### Response Timeline

| Stage | Expected Time |
|-------|--------------|
| Acknowledgment | Within 48 hours |
| Initial Assessment | Within 5 business days |
| Status Update | Every 7 days until resolved |
| Fix Delivery | Depends on severity and complexity |

### Severity Levels

| Level | Description |
|-------|-------------|
| **Critical** | Remote code execution, hardware access, or data breach |
| **High** | Privilege escalation or significant information disclosure |
| **Medium** | Limited information disclosure or denial of service |
| **Low** | Minor information leakage or cosmetic issues |

### Scope

**In Scope:**
- Nanggroe IoT core application code
- API endpoints and authentication
- Hardware communication protocols
- Database access controls
- Desktop (Tauri) and mobile (Capacitor) packaging

**Out of Scope:**
- Third-party library vulnerabilities (report to library maintainers)
- Social engineering attacks
- Physical access attacks on robotics hardware
- Denial of service via network flooding

### Responsible Disclosure

We ask that you:

1. **Do not exploit** the vulnerability beyond what is needed to demonstrate it
2. **Do not access** or modify other users' data
3. **Do not disclose** the vulnerability publicly until a fix is released
4. **Provide reasonable time** for us to address the issue before any public disclosure

We are committed to working with security researchers to resolve issues quickly and will credit reporters (with permission) in our security advisories.

### Security Best Practices for Deployers

When deploying Nanggroe IoT:

- Keep your `.env` file secure and never commit it to version control
- Use strong API keys for LLM and Telegram integrations
- Restrict serial port access to authorized users only
- Enable HTTPS in production (use the provided Caddyfile)
- Regularly update dependencies with `bun update`
- Review hardware access permissions on your host system
- Monitor telemetry for unusual activity patterns

---

*Thank you for helping keep Nanggroe IoT and its users safe.*
