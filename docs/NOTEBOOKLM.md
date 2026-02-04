# NotebookLM Integration Guide

This guide explains how to use Google NotebookLM with the OpenBMC Learning Platform for AI-powered Q&A, content generation, and quiz creation.

## Overview

The platform integrates with NotebookLM to provide:

- **AI-powered Q&A**: Users can ask questions about OpenBMC topics
- **Content generation**: Generate detailed explanations from documentation
- **Quiz generation**: Create quiz questions grounded in source material

## Current Notebook Configuration

### OpenBMC Guide Tutorial Notebook

**Notebook ID**: `openbmc-guide-tutorial`
**URL**: https://notebooklm.google.com/notebook/bb63fb0e-1b83-4f1b-acfb-dd1df115f379

**Topics covered**:

- OpenBMC, D-Bus, Sensors, Redfish, IPMI
- QEMU, Yocto, Firmware, Platform Porting, Security

**Content sections**:

1. Getting Started (Beginner)
2. Architecture (Beginner-Intermediate)
3. Core Services (Intermediate)
4. Interfaces (Intermediate)
5. Advanced Topics (Advanced)
6. Platform Porting (Advanced)

## Managing the NotebookLM Library

### Check Authentication Status

```bash
cd ~/.claude/skills/notebooklm
python3 scripts/run.py auth_manager.py status
```

### List Notebooks

```bash
python3 scripts/run.py notebook_manager.py list
```

### Add a New Notebook

```bash
python3 scripts/run.py notebook_manager.py add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "Notebook Name" \
  --description "What this notebook contains" \
  --topics "topic1,topic2,topic3"
```

### Query a Notebook

```bash
python3 scripts/run.py ask_question.py \
  --question "Your question here" \
  --notebook-id openbmc-guide-tutorial
```

### Set Active Notebook

```bash
python3 scripts/run.py notebook_manager.py activate --id openbmc-guide-tutorial
```

## Adding Documentation to NotebookLM

### Manual Upload Process

1. Go to [NotebookLM](https://notebooklm.google.com/)
2. Open your notebook or create a new one
3. Click "Add source" button
4. Upload documentation files:
   - PDF documents
   - Google Docs
   - Text files
   - Web URLs

### Recommended Content Structure

For best results, organize documentation by topic:

```
Notebook: OpenBMC Guide Tutorial
├── Getting Started
│   ├── environment-setup.md
│   ├── first-build.md
│   └── qemu-testing.md
├── Core Concepts
│   ├── dbus-architecture.md
│   ├── state-management.md
│   └── design-patterns.md
├── Services
│   ├── sensors.md
│   ├── fan-control.md
│   └── power-management.md
└── Interfaces
    ├── ipmi.md
    ├── redfish.md
    └── webui.md
```

### Content Guidelines

For optimal NotebookLM performance:

1. **Use clear headings**: Structure content with markdown headings
2. **Include code examples**: NotebookLM can reference code in answers
3. **Add context**: Explain why, not just how
4. **Cross-reference**: Link related topics within documents
5. **Update regularly**: Keep documentation current with OpenBMC releases

## Platform Integration

### API Endpoints

The platform provides these NotebookLM-related endpoints:

- `POST /api/ai/ask` - Ask a question about lesson content
- `POST /api/ai/generate-quiz` - Generate quiz from content
- `GET /api/ai/status` - Check NotebookLM connection status

### Rate Limits

- **Questions per hour**: 20 per user
- **Daily limit**: 50 queries (free Google account)

### Fallback Behavior

When NotebookLM is unavailable:

- Q&A shows "AI assistance temporarily unavailable"
- Quiz generation uses rule-based extraction
- Content displays static lesson material

## Mapping Content to Learning Paths

### Current Mapping

| Learning Path        | NotebookLM Topics                    |
| -------------------- | ------------------------------------ |
| OpenBMC Fundamentals | dbus, sensors, architecture          |
| System Management    | power, fan-control, logging          |
| BMC Interfaces       | ipmi, redfish, webui                 |
| Advanced Development | security, firmware, platform-porting |
| QEMU Development     | qemu, yocto, testing                 |

### Adding New Mappings

Update the lesson metadata to include NotebookLM context:

```typescript
// In lesson creation/import
{
  title: "D-Bus Architecture",
  notebookTopics: ["dbus", "architecture"],
  notebookContext: "This lesson covers D-Bus messaging..."
}
```

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate (opens browser)
python3 scripts/run.py auth_manager.py reauth

# Clear and start fresh
python3 scripts/run.py auth_manager.py clear
python3 scripts/run.py auth_manager.py setup
```

### Slow Responses

- Each query opens a new browser session
- Allow 10-30 seconds per query
- Complex questions may take longer

### Rate Limit Exceeded

- Wait for the rate limit window to reset
- Consider upgrading Google account for higher limits
- Use cached responses when available

## Security Considerations

- Browser state stored in `~/.claude/skills/notebooklm/data/`
- Never commit authentication data to git
- NotebookLM requires Google account login
- Platform caches responses to reduce API calls

## Resources

- [NotebookLM Help Center](https://support.google.com/notebooklm)
- [OpenBMC Documentation](https://github.com/openbmc/docs)
- [Platform API Documentation](/api/docs)
