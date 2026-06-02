#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create a professional PDF guide for LIFT Fitness remote work setup
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

# Create PDF
pdf_path = r"C:\Users\Tomas\Desktop\PROYECTO CLAUDE CODE\LIFT-FITNESS-REMOTE-SETUP.pdf"
doc = SimpleDocTemplate(pdf_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)

# Get styles
styles = getSampleStyleSheet()

# Create custom styles
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=28,
    textColor=colors.HexColor('#1f3a93'),
    spaceAfter=12,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=14,
    textColor=colors.HexColor('#2c5aa0'),
    spaceAfter=10,
    spaceBefore=10,
    fontName='Helvetica-Bold'
)

code_style = ParagraphStyle(
    'Code',
    parent=styles['Normal'],
    fontSize=9,
    fontName='Courier',
    textColor=colors.HexColor('#333333'),
    backColor=colors.HexColor('#f5f5f5'),
    leftIndent=20,
    spaceAfter=6
)

# Story to hold PDF content
story = []

# ============ TITLE PAGE ============
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph("LIFT Fitness Backend", title_style))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Remote Work & Collaboration Guide", styles['Heading2']))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph(f"Created: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph("✅ Ready for Multi-User Collaboration", styles['Heading3']))
story.append(Spacer(1, 2*inch))

# ============ TABLE OF CONTENTS ============
story.append(PageBreak())
story.append(Paragraph("📋 Table of Contents", heading_style))
story.append(Spacer(1, 0.2*inch))

toc_items = [
    "1. Quick Start",
    "2. Repository Setup",
    "3. Initial Cloning",
    "4. Environment Configuration",
    "5. Workflow & Git Commands",
    "6. Demo Credentials",
    "7. Auto-Deploy Process",
    "8. Multi-User Collaboration",
    "9. Troubleshooting",
    "10. Resources & Links"
]

for item in toc_items:
    story.append(Paragraph(f"• {item}", styles['Normal']))
    story.append(Spacer(1, 0.1*inch))

# ============ 1. QUICK START ============
story.append(PageBreak())
story.append(Paragraph("1️⃣  Quick Start", heading_style))
story.append(Paragraph("Get up and running in 5 minutes:", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("<b>Step 1: Clone Repository</b>", styles['Normal']))
story.append(Paragraph("git clone https://github.com/tomasmineoo-ctrl/lift-fitness-backend.git", code_style))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("<b>Step 2: Install Dependencies</b>", styles['Normal']))
story.append(Paragraph("npm install", code_style))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("<b>Step 3: Configure Environment</b>", styles['Normal']))
story.append(Paragraph("Copy .env.example to .env and add your Supabase credentials", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("<b>Step 4: Start Development</b>", styles['Normal']))
story.append(Paragraph("npm run dev", code_style))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("✅ Your app will be running on http://localhost:3000", styles['Normal']))

# ============ 2. REPOSITORY SETUP ============
story.append(PageBreak())
story.append(Paragraph("2️⃣  Repository Setup", heading_style))

story.append(Paragraph("<b>📍 GitHub Repository</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("https://github.com/tomasmineoo-ctrl/lift-fitness-backend", code_style))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("<b>👤 Owner:</b> tomasmineoo-ctrl", styles['Normal']))
story.append(Paragraph("<b>🔍 Visibility:</b> Public (anyone can clone)", styles['Normal']))
story.append(Paragraph("<b>⚙️ CI/CD:</b> Auto-deploy to Railway on every push", styles['Normal']))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("<b>What's Included in the Repository:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

repo_items = [
    "✅ Node.js + Express + TypeScript backend",
    "✅ Supabase database migrations & seed scripts",
    "✅ Pre-configured environment variables",
    "✅ HTTP Basic Auth middleware",
    "✅ REST API endpoints",
    "✅ Pre-populated login form",
    "✅ Demo credentials for 5 roles"
]

for item in repo_items:
    story.append(Paragraph(f"• {item}", styles['Normal']))
    story.append(Spacer(1, 0.05*inch))

# ============ 3. INITIAL CLONING ============
story.append(PageBreak())
story.append(Paragraph("3️⃣  Initial Cloning (First Time Only)", heading_style))

story.append(Paragraph("<b>On Your Notebook:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

clone_steps = [
    ("Open PowerShell", ""),
    ("Navigate to your projects folder", "cd C:\\Users\\YOUR_NAME\\Desktop"),
    ("Clone the repository", "git clone https://github.com/tomasmineoo-ctrl/lift-fitness-backend.git"),
    ("Enter the directory", "cd lift-fitness-backend"),
    ("Install dependencies", "npm install"),
]

for step_num, (step_desc, step_cmd) in enumerate(clone_steps, 1):
    story.append(Paragraph(f"<b>{step_num}. {step_desc}</b>", styles['Normal']))
    if step_cmd:
        story.append(Paragraph(step_cmd, code_style))
    story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("<b>✅ Done!</b> You now have a local copy of the project.", styles['Normal']))

# ============ 4. ENVIRONMENT CONFIGURATION ============
story.append(PageBreak())
story.append(Paragraph("4️⃣  Environment Configuration", heading_style))

story.append(Paragraph("<b>Create .env File:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Copy .env.example to .env:", code_style))
story.append(Paragraph("Copy-Item \".env.example\" \".env\"", code_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("<b>Required Environment Variables:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

env_vars = [
    ("SUPABASE_URL", "https://usbdbcpbcjovsqmpkrnm.supabase.co", "Database URL"),
    ("SUPABASE_SERVICE_ROLE_KEY", "[Provided separately]", "Database auth key"),
    ("JWT_SECRET", "lift-fitness-jwt-secret-2025-secure-key", "Session secret"),
    ("JWT_EXPIRES_IN", "7d", "Token expiration"),
    ("NODE_ENV", "development", "Environment mode"),
]

for var, value, desc in env_vars:
    story.append(Paragraph(f"<b>{var}</b> = {value}", code_style))
    story.append(Paragraph(f"<i>{desc}</i>", styles['Normal']))
    story.append(Spacer(1, 0.05*inch))

story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("⚠️ <b>Important:</b> Never commit .env to GitHub!", styles['Normal']))

# ============ 5. WORKFLOW & GIT COMMANDS ============
story.append(PageBreak())
story.append(Paragraph("5️⃣  Workflow & Git Commands", heading_style))

story.append(Paragraph("<b>A. Before You Start Working</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Always pull the latest changes from GitHub:", code_style))
story.append(Paragraph("git pull origin main", code_style))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("<b>B. While You Work</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("View your changes:", code_style))
story.append(Paragraph("git status", code_style))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("See detailed changes:", code_style))
story.append(Paragraph("git diff", code_style))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("<b>C. When You're Done (Push to Production)</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

push_commands = [
    ("Stage changes", "git add ."),
    ("Create a commit", "git commit -m \"Your descriptive message\""),
    ("Push to GitHub", "git push origin main"),
]

for step_desc, step_cmd in push_commands:
    story.append(Paragraph(f"<b>{step_desc}:</b>", styles['Normal']))
    story.append(Paragraph(step_cmd, code_style))
    story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("🚀 <b>Railway will automatically deploy your changes!</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Check deployment progress at: https://railway.app", styles['Normal']))

# ============ 6. DEMO CREDENTIALS ============
story.append(PageBreak())
story.append(Paragraph("6️⃣  Demo Credentials", heading_style))

story.append(Paragraph("<b>🔐 Domain Access (HTTP Basic Auth)</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

auth_data = [
    ["Username", "SEBASTIAN"],
    ["Password", "TOMASYSEBASTIAN"],
]
auth_table = Table(auth_data, colWidths=[2*inch, 3.5*inch])
auth_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#1f3a93')),
    ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
]))
story.append(auth_table)
story.append(Spacer(1, 0.3*inch))

story.append(Paragraph("<b>👥 Demo User Roles (Pre-filled in Login Form)</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

demo_data = [
    ["Role", "Email", "Password"],
    ["Admin", "admin@lift.com", "Lift2025#"],
    ["Reception", "recep@lift.com", "recep2025"],
    ["Trainer", "trainer@lift.com", "trainer2025"],
    ["Nutritionist", "nutricion@lift.com", "nutri2025"],
    ["Member (Socio)", "carlos@mail.com", "1234"],
]

demo_table = Table(demo_data, colWidths=[1.5*inch, 2*inch, 2*inch])
demo_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5aa0')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 9),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ('FONTSIZE', (0, 1), (-1, -1), 8),
]))
story.append(demo_table)
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("💡 <b>Tip:</b> Demo buttons in the UI let you switch between roles instantly.", styles['Normal']))

# ============ 7. AUTO-DEPLOY PROCESS ============
story.append(PageBreak())
story.append(Paragraph("7️⃣  Auto-Deploy Process", heading_style))

story.append(Paragraph("<b>How It Works:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

deploy_steps = [
    "You make changes locally and do: git push origin main",
    "GitHub receives your code",
    "Railway detects the push (webhook integration)",
    "Railway rebuilds the application",
    "New version deploys to production",
    "ctrlgym.org gets updated (1-3 minutes)",
]

for i, step in enumerate(deploy_steps, 1):
    story.append(Paragraph(f"<b>{i}.</b> {step}", styles['Normal']))
    story.append(Spacer(1, 0.08*inch))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("<b>Check Deployment Status:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("Visit: https://railway.app → Select lift-fitness project → View logs", styles['Normal']))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("<b>⚠️ What To Avoid:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("• Don't commit .env files (they contain secrets)", styles['Normal']))
story.append(Paragraph("• Don't push to production without testing locally first", styles['Normal']))
story.append(Paragraph("• Don't force push (git push --force) to main branch", styles['Normal']))

# ============ 8. MULTI-USER COLLABORATION ============
story.append(PageBreak())
story.append(Paragraph("8️⃣  Multi-User Collaboration", heading_style))

story.append(Paragraph("<b>✅ Yes, Multiple Users Can Work on This Project!</b>", styles['Normal']))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("<b>How It Works:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

collab_points = [
    "User A clones the repo and makes changes → git push",
    "Railway auto-deploys User A's changes",
    "User B pulls latest changes → git pull origin main",
    "User B sees User A's updates and can build on them",
    "User B makes their own changes → git push",
    "Process repeats...",
]

for point in collab_points:
    story.append(Paragraph(f"→ {point}", styles['Normal']))
    story.append(Spacer(1, 0.08*inch))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("<b>Best Practices for Teams:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

practices = [
    "Always pull before starting work: git pull origin main",
    "Use descriptive commit messages",
    "Coordinate with teammates on what you're working on",
    "Test changes locally before pushing",
    "Don't work on the same files simultaneously",
]

for i, practice in enumerate(practices, 1):
    story.append(Paragraph(f"{i}. {practice}", styles['Normal']))
    story.append(Spacer(1, 0.08*inch))

# ============ 9. TROUBLESHOOTING ============
story.append(PageBreak())
story.append(Paragraph("9️⃣  Troubleshooting", heading_style))

story.append(Paragraph("<b>Error: \"npm: command not found\"</b>", styles['Normal']))
story.append(Paragraph("→ Node.js not installed. Download from: https://nodejs.org/", styles['Normal']))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("<b>Error: \"SUPABASE_URL not defined\"</b>", styles['Normal']))
story.append(Paragraph("→ Create .env file with all required variables", styles['Normal']))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("<b>Error: \"Connection refused on localhost:3000\"</b>", styles['Normal']))
story.append(Paragraph("→ Run: npm run dev (or npm start)", styles['Normal']))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("<b>Changes not appearing on ctrlgym.org</b>", styles['Normal']))
story.append(Paragraph("→ Make sure you did git push origin main", styles['Normal']))
story.append(Paragraph("→ Wait 1-3 minutes for Railway to rebuild", styles['Normal']))
story.append(Paragraph("→ Refresh the browser cache (Ctrl+Shift+R)", styles['Normal']))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("<b>Git merge conflicts</b>", styles['Normal']))
story.append(Paragraph("→ Coordinate with your team to avoid working on same files", styles['Normal']))
story.append(Paragraph("→ If conflict occurs, ask for help from main developer", styles['Normal']))

# ============ 10. RESOURCES & LINKS ============
story.append(PageBreak())
story.append(Paragraph("🔟 Resources & Links", heading_style))

story.append(Paragraph("<b>📍 Important URLs:</b>", styles['Normal']))
story.append(Spacer(1, 0.15*inch))

links = [
    ("GitHub Repository", "https://github.com/tomasmineoo-ctrl/lift-fitness-backend"),
    ("Live Demo", "https://ctrlgym.org"),
    ("Railway Dashboard", "https://railway.app"),
    ("Supabase Console", "https://supabase.com/dashboard"),
    ("Node.js Documentation", "https://nodejs.org/docs"),
    ("Git Documentation", "https://git-scm.com/doc"),
]

for label, url in links:
    story.append(Paragraph(f"<b>{label}:</b> {url}", styles['Normal']))
    story.append(Spacer(1, 0.1*inch))

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("<b>📚 Stack Technologies:</b>", styles['Normal']))
story.append(Spacer(1, 0.1*inch))

techs = [
    "Node.js - JavaScript runtime",
    "Express - Web framework",
    "TypeScript - Strongly-typed JavaScript",
    "Supabase - PostgreSQL + Auth + Storage",
    "Railway - Cloud deployment platform",
    "GitHub - Version control",
]

for tech in techs:
    story.append(Paragraph(f"• {tech}", styles['Normal']))
    story.append(Spacer(1, 0.08*inch))

# ============ FOOTER ============
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph("=" * 80, styles['Normal']))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph(
    "<i>This guide was created to enable seamless remote collaboration on the LIFT Fitness Backend project. "
    "For questions or updates, coordinate with the team lead.</i>",
    styles['Normal']
))
story.append(Paragraph(
    f"Last updated: {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}",
    styles['Normal']
))

# Build PDF
doc.build(story)
print(f"[OK] PDF created successfully: {pdf_path}")
