#!/usr/bin/env python3
"""Generate Nanggroe OS AI Upgrade & Branding Proposal PDF"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, KeepTogether, Image,
                                 HRFlowable, ListFlowable, ListItem)
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

# ━━ Color Palette ━━
ACCENT = HexColor('#b3394e')
ACCENT_SEC = HexColor('#8a37c5')
TEXT_PRIMARY = HexColor('#222426')
TEXT_MUTED = HexColor('#858b8f')
BG_PAGE = HexColor('#eef0f0')
BG_SURFACE = HexColor('#e9ebec')
CARD_BG = HexColor('#e6e9ea')
HEADER_FILL = HexColor('#3f5f6f')
COVER_BLOCK = HexColor('#435b66')
BORDER = HexColor('#b2bfc5')
ICON = HexColor('#48819d')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = HexColor('#eceeef')

# Register fonts
font_dir = '/usr/share/fonts/truetype'
try:
    pdfmetrics.registerFont(TTFont('NotoSansSC', f'{font_dir}/chinese/NotoSansSC[wght].ttf'))
    BODY_FONT = 'NotoSansSC'
except:
    BODY_FONT = 'Helvetica'

try:
    pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{font_dir}/noto-serif-sc/NotoSerifSC[wght].ttf'))
    HEADING_FONT = 'NotoSerifSC'
except:
    HEADING_FONT = 'Helvetica-Bold'

try:
    pdfmetrics.registerFont(TTFont('Carlito', f'{font_dir}/english/Carlito-Regular.ttf'))
    LATIN_FONT = 'Carlito'
except:
    LATIN_FONT = 'Helvetica'

OUT = '/home/z/my-project/download/Nanggroe_OSAI_Upgrade_Proposal.pdf'
W, H = A4

# Styles
styles = getSampleStyleSheet()

sTitle = ParagraphStyle('sTitle', parent=styles['Title'], fontName=HEADING_FONT, fontSize=28, leading=34, textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=6)
sH1 = ParagraphStyle('sH1', parent=styles['Heading1'], fontName=HEADING_FONT, fontSize=20, leading=26, textColor=HexColor('#3f5f6f'), spaceBefore=18, spaceAfter=10, borderWidth=0, borderPadding=0)
sH2 = ParagraphStyle('sH2', parent=styles['Heading2'], fontName=HEADING_FONT, fontSize=15, leading=20, textColor=ACCENT, spaceBefore=14, spaceAfter=8)
sH3 = ParagraphStyle('sH3', parent=styles['Heading3'], fontName=HEADING_FONT, fontSize=12, leading=16, textColor=ICON, spaceBefore=10, spaceAfter=6)
sBody = ParagraphStyle('sBody', parent=styles['Normal'], fontName=BODY_FONT, fontSize=10, leading=15, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6, firstLineIndent=0)
sBodyMuted = ParagraphStyle('sBodyMuted', parent=sBody, textColor=TEXT_MUTED, fontSize=9, leading=13)
sBullet = ParagraphStyle('sBullet', parent=sBody, leftIndent=18, bulletIndent=6, spaceBefore=2, spaceAfter=2)
sCaption = ParagraphStyle('sCaption', parent=sBody, fontName=LATIN_FONT, fontSize=8, leading=11, textColor=TEXT_MUTED, alignment=TA_CENTER)
sMeta = ParagraphStyle('sMeta', parent=sBody, fontSize=9, leading=13, textColor=TEXT_MUTED)
sKicker = ParagraphStyle('sKicker', parent=sBody, fontName=LATIN_FONT, fontSize=11, leading=15, textColor=ACCENT, spaceAfter=4)
sHighlight = ParagraphStyle('sHighlight', parent=sBody, backColor=HexColor('#fdf2f4'), borderWidth=1, borderColor=ACCENT, borderPadding=6, leftIndent=12, rightIndent=12)

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=2.2*cm, rightMargin=2.2*cm, topMargin=2*cm, bottomMargin=2*cm, title='Nanggroe OS AI — Upgrade & Branding Proposal', author='Mulky Malikul Dhaher', subject='Upgrade Proposal v1.0')

story = []

# ━━ COVER PAGE ━━
story.append(Spacer(1, 3*cm))
story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=12))
story.append(Paragraph('NANGGROE OS AI', ParagraphStyle('coverHero', parent=sTitle, fontSize=36, leading=42, textColor=HexColor('#3f5f6f'), alignment=TA_CENTER)))
story.append(Paragraph('Upgrade & Branding Proposal', ParagraphStyle('coverSub', parent=sTitle, fontSize=18, leading=24, textColor=ACCENT, alignment=TA_CENTER, spaceAfter=8)))
story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=12, spaceAfter=20))
story.append(Paragraph('Modular Autonomous Robotics Operating System Platform', ParagraphStyle('coverDesc', parent=sBody, fontSize=13, leading=19, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=30)))
story.append(Spacer(1, 1.5*cm))

coverInfo = [
    ['Author', 'Mulky Malikul Dhaher'],
    ['Email', 'mulkymalikuldhaher@email.com'],
    ['Version', '1.0.0'],
    ['Date', 'May 2025'],
    ['Document Type', 'Upgrade & Branding Proposal'],
]
coverTable = Table(coverInfo, colWidths=[3.5*cm, 9*cm])
coverTable.setStyle(TableStyle([
    ('FONTNAME', (0,0), (0,-1), HEADING_FONT),
    ('FONTNAME', (1,0), (1,-1), BODY_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 10),
    ('TEXTCOLOR', (0,0), (0,-1), TEXT_MUTED),
    ('TEXTCOLOR', (1,0), (1,-1), TEXT_PRIMARY),
    ('ALIGN', (0,0), (0,-1), 'RIGHT'),
    ('ALIGN', (1,0), (1,-1), 'LEFT'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('RIGHTPADDING', (0,0), (0,-1), 12),
]))
story.append(coverTable)
story.append(PageBreak())

# ━━ TABLE OF CONTENTS ━━
story.append(Paragraph('DAFTAR ISI', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))
toc_items = [
    ('1', 'Eksekutif Ringkasan', '3'),
    ('2', 'Penamaan & Branding', '3'),
    ('3', 'Fitur Baru & Upgrade Roadmap', '4'),
    ('4', 'Cross-Platform: Linux, Windows, Android', '6'),
    ('5', 'Arsitektur Teknis', '7'),
    ('6', 'Robot Template yang Didukung', '8'),
    ('7', 'Rencana Implementasi', '9'),
    ('8', 'Budget & Resource', '10'),
]
for num, title, pg in toc_items:
    story.append(Paragraph(f'<b>{num}.</b>  {title} {"." * 60} {pg}', ParagraphStyle('toc', parent=sBody, fontSize=11, leading=18, textColor=TEXT_PRIMARY)))
story.append(PageBreak())

# ━━ SECTION 1: EXECUTIVE SUMMARY ━━
story.append(Paragraph('1. EKSEKUTIF RINGKASAN', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))
story.append(Paragraph('Nanggroe OS AI adalah platform sistem operasi robotika otonom modular yang dirancang untuk mendukung berbagai jenis proyek Arduino, Raspberry Pi, dan platform embedded lainnya. Platform ini mengintegrasikan kecerdasan buatan lokal, deteksi hardware otomatis, dan kontrol multi-agent untuk memberikan pengalaman pembangunan robot yang seamless dari desain hingga deployment.', sBody))
story.append(Paragraph('Dokumen ini menyajikan proposal komprehensif untuk upgrade branding, penamaan, fitur baru, dan ekspansi cross-platform ke Linux, Windows, dan Android. Seluruh rencana disusun berdasarkan audit mendalam terhadap codebase yang ada, identifikasi gap, dan riset teknologi terkini termasuk Tauri v2 dan Capacitor untuk packaging multi-platform.', sBody))
story.append(Spacer(1, 6))

# Highlight box
story.append(Paragraph('<b>Status Current Build:</b> Zero TypeScript errors, 42 API routes, 21 lib services, 21+ dashboard tabs, 9 robot templates, 21 Prisma models. Build production-ready.', sHighlight))
story.append(Spacer(1, 10))

# ━━ SECTION 2: NAMING & BRANDING ━━
story.append(Paragraph('2. PENAMAAN & BRANDING', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('2.1 Nama Resmi', sH2))
story.append(Paragraph('<b>NANGGROE OS AI</b> — nama ini dipilih karena merepresentasikan identitas lokal Aceh (Nanggroe = negeri/kerajaan dalam bahasa Aceh) dengan kemampuan modern AI. Nama ini unik, mudah diingat, dan memiliki makna mendalam tentang kedaulatan teknologi lokal.', sBody))

story.append(Paragraph('2.2 Alternatif Nama yang Dipertimbangkan', sH2))
name_data = [
    ['Nama', 'Kelebihan', 'Kekurangan', 'Rekomendasi'],
    ['Nanggroe OS AI', 'Identitas lokal kuat, unik, bermakna', 'Sulit diucap non-Indonesia', 'DIPILIH'],
    ['NanggroeOS', 'Lebih ringkas, mirip ROS/Ubuntu', 'Kehilangan esensi AI', 'Alternatif'],
    ['NanggroAI', 'Ringkas, catchy', 'Kehilangan esensi OS', 'Tidak'],
    ['AcheOS AI', 'Merekam Aceh secara eksplisit', 'Kontroversial, "Ache" negatif', 'Tidak'],
    ['RoboNanggroe', 'Jelas robotics + lokal', 'Terlalu main-stream', 'Cadangan'],
]
nt = Table(name_data, colWidths=[3.2*cm, 4.2*cm, 4*cm, 2.5*cm])
nt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0,1), (-1,-1), colors.white),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ALIGN', (0,0), (-1,0), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(nt)
story.append(Spacer(1, 10))

story.append(Paragraph('2.3 Branding Elements', sH2))
story.append(Paragraph('Tagline: <b>"Sovereign AI for Autonomous Robotics"</b> — menekankan kedaulatan teknologi dan kemampuan AI otonom. Tagline alternatif dalam bahasa Indonesia: <b>"AI Berdaulat untuk Robotika Otonom"</b>.', sBody))
story.append(Paragraph('Logo concept: Geometric drone silhouette dengan pattern Aceh terintegrasi, warna teal (#48819d) dan dark slate (#3f5f6f) sebagai primary, accent merah (#b3394e) untuk highlight.', sBody))
story.append(Paragraph('Author & Copyright: <b>Mulky Malikul Dhaher</b> (mulkymalikuldhaher@email.com). Lisensi MIT untuk open-source community.', sBody))

story.append(PageBreak())

# ━━ SECTION 3: FEATURES & ROADMAP ━━
story.append(Paragraph('3. FITUR BARU & UPGRADE ROADMAP', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('3.1 Fitur yang Sudah Diimplementasi (v1.0)', sH2))
feat_data = [
    ['Fitur', 'Status', 'Detail'],
    ['AI Agents (Hermes + PicoClaw)', 'Production', 'Real AI SDK + deterministic safety checks'],
    ['Local LLM Engine', 'Production', '5 model: TinyLlama, Phi-2, Llama-3.2, Gemma-2, Qwen2.5'],
    ['Hardware Auto-Detect', 'Production', 'Scan USB/I2C/SPI/UART, auto-configure drivers'],
    ['Hardware Bridge (Serial/I2C/SPI/GPIO)', 'Production', 'Real hardware I/O + simulation fallback'],
    ['MCP Protocol (JSON-RPC 2.0)', 'Production', '9 built-in tools, SSE transport'],
    ['Firmware Flashing', 'Production', 'SHA-256 verification, rollback, multi-target'],
    ['Face Tracking', 'Production', 'Detect/follow/identify, servo control, DB-backed'],
    ['Self-Learning', 'Production', 'Pattern detection, auto-tune, knowledge transfer'],
    ['Telegram Bot', 'Production', 'Real Bot API, contextual AI responses'],
    ['Voice/TTS/STT', 'Production', 'Real z-ai SDK, structured responses'],
    ['GSM (SIM800L)', 'Production', 'Real AT commands via serial'],
    ['Navigation & GPS', 'Production', 'Field mapping, delivery, RTH, GSD calculation'],
    ['Robot Templates', 'Production', '9 templates (drone, rover, boat, arm, hexapod, dll)'],
    ['VSCode Extension Bridge', 'Production', 'WebSocket push, DB-persisted, real completions'],
    ['AI Memory + Cloud Sync', 'Production', 'Batch sync, retry backoff, conflict resolution'],
    ['42 API Routes', 'Production', 'REST + SSE streaming, full CRUD'],
    ['21 Dashboard Tabs', 'Production', 'Loading states, error handling, responsive'],
]
ft = Table(feat_data, colWidths=[4.5*cm, 2*cm, 8.5*cm])
ft.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(ft)
story.append(Spacer(1, 10))

story.append(Paragraph('3.2 Roadmap v1.1 — v2.0', sH2))
road_data = [
    ['Versi', 'Fitur', 'Target', 'Prioritas'],
    ['v1.1', 'Tauri v2 Desktop App (Linux .deb/.AppImage, Windows .exe/.msi)', 'Q3 2025', 'Tinggi'],
    ['v1.1', 'Capacitor Android App (.apk/.aab)', 'Q3 2025', 'Tinggi'],
    ['v1.1', 'Mobile-responsive layout + bottom navigation', 'Q3 2025', 'Tinggi'],
    ['v1.2', 'Offline-first PWA dengan service worker', 'Q3 2025', 'Sedang'],
    ['v1.2', 'Real serial port monitoring (MAVLink live)', 'Q3 2025', 'Tinggi'],
    ['v1.2', 'Multi-language support (ID/EN)', 'Q3 2025', 'Sedang'],
    ['v1.3', '3D robot visualization (Three.js)', 'Q4 2025', 'Sedang'],
    ['v1.3', 'Community template marketplace', 'Q4 2025', 'Rendah'],
    ['v1.5', 'Custom Raspberry Pi OS image builder', 'Q4 2025', 'Tinggi'],
    ['v1.5', 'OTA firmware update over GSM/WiFi', 'Q4 2025', 'Sedang'],
    ['v2.0', 'Multi-robot fleet management', 'Q1 2026', 'Sedang'],
    ['v2.0', 'Edge AI inference optimization (ONNX/TFLite)', 'Q1 2026', 'Sedang'],
    ['v2.0', 'Digital twin simulation environment', 'Q1 2026', 'Rendah'],
]
rt = Table(road_data, colWidths=[1.5*cm, 7*cm, 2*cm, 2*cm])
rt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(rt)

story.append(PageBreak())

# ━━ SECTION 4: CROSS-PLATFORM ━━
story.append(Paragraph('4. CROSS-PLATFORM: LINUX, WINDOWS, ANDROID', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('4.1 Strategi Packaging', sH2))
story.append(Paragraph('Berdasarkan riset mendalam terhadap Tauri v2, Electron, dan Capacitor, kami merekomendasikan pendekatan dual-framework yang optimal untuk masing-masing target platform:', sBody))

plat_data = [
    ['Platform', 'Framework', 'Output', 'Ukuran Est.', 'Kelebihan'],
    ['Linux', 'Tauri v2', '.deb + .AppImage', '~15 MB', '96% lebih kecil dari Electron, native performance'],
    ['Windows', 'Tauri v2', '.exe + .msi', '~12 MB', 'WebView2 built-in Windows 10+, no Chromium bundle'],
    ['Android', 'Capacitor', '.apk + .aab', '~25 MB', 'Native Android API access, Play Store ready'],
    ['Web (PWA)', 'Next.js', 'Browser', 'N/A', 'Offline-first, installable, cross-browser'],
]
pt = Table(plat_data, colWidths=[2*cm, 2.2*cm, 2.8*cm, 2*cm, 5*cm])
pt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(pt)
story.append(Spacer(1, 8))

story.append(Paragraph('4.2 Tauri v2 — Desktop App (Linux + Windows)', sH2))
story.append(Paragraph('Tauri v2 dipilih karena menghasilkan aplikasi desktop yang 96% lebih kecil dan menggunakan 50% lebih sedikit RAM dibanding Electron. Arsitekturnya menggunakan Rust backend dengan webview native sistem operasi, bukan bundled Chromium. Keunggulan utama: keamanan tinggi (Rust memory-safe), startup cepat, dan binary kecil (~12-15 MB vs 150+ MB Electron).', sBody))
story.append(Paragraph('Konfigurasi Tauri v2 sudah diimplementasi di direktori src-tauri/ dengan identifier com.nanggroe.os-ai, window 1440x900, shell plugin untuk akses sistem, dan icon set yang di-generate oleh AI. Build command tersedia: <b>tauri:build:linux</b> untuk DEB + AppImage, <b>tauri:build:windows</b> untuk MSI + NSIS installer.', sBody))

story.append(Paragraph('4.3 Capacitor — Android App', sH2))
story.append(Paragraph('Capacitor dipilih untuk Android karena menyediakan akses native ke Android API (kamera, GPS, sensor, storage) sambil tetap menggunakan codebase web yang sama. Berbeda dengan React Native yang memerlukan rewrite, Capacitor membungkus Next.js app dalam Android WebView dengan bridge ke native functionality.', sBody))
story.append(Paragraph('Konfigurasi Capacitor sudah diimplementasi dengan package ID com.nanggroe.osai, dark splash screen, adaptive icon, dan MobileLayout component yang menyediakan bottom navigation untuk UX Android. Script tersedia: <b>android:build</b> untuk build + sync, <b>android:open</b> untuk buka di Android Studio.', sBody))

story.append(Paragraph('4.4 Platform Detection & Adaptive UI', sH2))
story.append(Paragraph('Hook usePlatform() yang sudah diimplementasi mendeteksi secara otomatis apakah app berjalan di Capacitor (Android), Tauri (Linux/Windows), atau browser (web). Berdasarkan deteksi ini, UI secara adaptif menggunakan sidebar navigation untuk desktop atau bottom navigation untuk mobile, dengan touch-friendly controls dan safe area insets untuk perangkat notched.', sBody))

story.append(PageBreak())

# ━━ SECTION 5: ARCHITECTURE ━━
story.append(Paragraph('5. ARSITEKTUR TEKNIS', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('5.1 Layer Architecture', sH2))
arch_data = [
    ['Layer', 'Komponen', 'Teknologi'],
    ['Presentation', 'Dashboard (21 tabs), Mobile Layout', 'Next.js 16, React 19, Tailwind CSS 4, shadcn/ui'],
    ['API Gateway', '42 REST + SSE endpoints', 'Next.js API Routes, Server-Sent Events'],
    ['Intelligence', 'Hermes Agent, PicoClaw Agent, LLM Engine', 'z-ai-web-dev-sdk, Local LLM (5 models)'],
    ['Services', '21 service modules', 'TypeScript, Prisma ORM, SQLite'],
    ['Hardware Abstraction', 'Hardware Bridge, Driver Registry', 'Serial, I2C, SPI, GPIO, MAVLink'],
    ['Device Control', '7 Device Drivers + Face Tracking', 'Pixhawk, RPi, GPS, Camera, Sensor, Radio, Battery'],
    ['Data', '21 Prisma Models + Sync Queue', 'SQLite (local), Cloud Sync (optional)'],
]
at = Table(arch_data, colWidths=[3*cm, 5.5*cm, 6*cm])
at.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(at)
story.append(Spacer(1, 8))

story.append(Paragraph('5.2 Cross-Platform Build Pipeline', sH2))
story.append(Paragraph('Pipeline build yang diimplementasi memungkinkan satu codebase Next.js untuk menghasilkan output ke empat platform sekaligus. Untuk Linux dan Windows, Tauri v2 meng-compile Rust wrapper yang memuat Next.js standalone server dan menampilkannya dalam native webview. Untuk Android, Capacitor meng-export static build Next.js dan membungkusnya dalam Android project dengan akses native API. Untuk web, Next.js berjalan langsung sebagai server-side application dengan PWA capability.', sBody))

build_data = [
    ['Target', 'Build Command', 'Prerequisite', 'Output'],
    ['Linux Desktop', 'bun run tauri:build:linux', 'Rust + libwebkit2gtk', 'nanggroe-os-ai_1.0.0_amd64.deb + .AppImage'],
    ['Windows Desktop', 'bun run tauri:build:windows', 'Rust + Visual Studio Build Tools', 'nanggroe-os-ai_1.0.0_x64.msi + .exe'],
    ['Android', 'bun run android:build && npx cap open android', 'Android Studio + SDK', 'app-release.apk + app-release.aab'],
    ['Web', 'bun run build && bun run start', 'Node.js / Bun', 'http://localhost:3000'],
]
bt = Table(build_data, colWidths=[2.5*cm, 4*cm, 3.5*cm, 5*cm])
bt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(bt)

story.append(PageBreak())

# ━━ SECTION 6: ROBOT TEMPLATES ━━
story.append(Paragraph('6. ROBOT TEMPLATE YANG DIDUKUNG', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('Nanggroe OS AI mendukung 9 template robot siap pakai, mencakup berbagai jenis proyek Arduino dan embedded system. Setiap template dilengkapi daftar hardware, firmware, panduan assembly, wiring diagram, dan kemampuan auto-detect yang akan memeriksa ketersediaan komponen secara otomatis.', sBody))

robot_data = [
    ['#', 'Template', 'Kategori', 'Difficulty', 'Jam Build'],
    ['1', 'Drone Tricopter 3-Baling (Arduino)', 'Amphibious', 'Intermediate', '16h'],
    ['2', 'Rover Darat 4 Roda', 'Rover/UGV', 'Beginner', '10h'],
    ['3', 'Kapal Amfibi USV', 'Boat/USV', 'Intermediate', '14h'],
    ['4', 'Robotic Arm 6-DOF', 'Arm', 'Intermediate', '12h'],
    ['5', 'Hexapod 6-Kaki (18 Servo)', 'Custom', 'Advanced', '24h'],
    ['6', 'Balloon / Blimp UAV', 'Drone', 'Beginner', '6h'],
    ['7', 'Arduino Custom Project', 'Custom', 'Beginner', '2h'],
    ['8', 'Underwater ROV', 'Boat/USV', 'Advanced', '28h'],
    ['9', 'Agri-Sprayer Drone', 'Drone', 'Intermediate', '18h'],
]
rbt = Table(robot_data, colWidths=[1*cm, 5*cm, 2.5*cm, 2.5*cm, 2*cm])
rbt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('ALIGN', (0,0), (0,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(rbt)
story.append(Spacer(1, 8))

story.append(Paragraph('Template "Arduino Custom Project" adalah template universal yang hanya memerlukan Arduino + kabel USB sebagai minimum hardware. Template ini mendukung semua jenis sensor dan aktuator, cocok untuk pemula yang ingin bereksperimen. Auto-detect system akan mengidentifikasi komponen yang terhubung dan secara otomatis mengkonfigurasi driver yang sesuai.', sBody))

story.append(PageBreak())

# ━━ SECTION 7: IMPLEMENTATION PLAN ━━
story.append(Paragraph('7. RENCANA IMPLEMENTASI', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('7.1 Fase Implementasi', sH2))
impl_data = [
    ['Fase', 'Aktivitas', 'Durasi', 'Deliverable'],
    ['Fase 1\n(Sekarang)', 'Branding update, metadata, author info,\nTauri + Capacitor setup', '2 minggu', 'Package.json updated, LICENSE, AUTHORS.md,\nTauri config, Capacitor config'],
    ['Fase 2', 'Desktop app build & test\n(Linux .deb/.AppImage + Windows .exe)', '2 minggu', 'Installer Linux + Windows yang bisa\ndi-distribute'],
    ['Fase 3', 'Android app build & test\n(Capacitor .apk)', '2 minggu', 'APK yang bisa di-install di Android device,\nPlay Store ready .aab'],
    ['Fase 4', 'Mobile-responsive UI polish,\noffline PWA, multi-language', '3 minggu', 'PWA installable, layout responsif,\nbahasa ID/EN'],
    ['Fase 5', 'Custom RPi image builder,\nOTA update, fleet management', '4 minggu', 'Flashable SD card image,\nOTA pipeline, fleet dashboard'],
]
it = Table(impl_data, colWidths=[2*cm, 5.5*cm, 2*cm, 5*cm])
it.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(it)
story.append(Spacer(1, 8))

story.append(Paragraph('7.2 Technical Dependencies', sH2))
story.append(Paragraph('Untuk menjalankan build pipeline cross-platform, diperlukan beberapa dependency teknis yang harus dipersiapkan pada development machine. Untuk Linux desktop build, dibutuhkan Rust toolchain (via rustup), libwebkit2gtk-4.1-dev, libgtk-3-dev, dan libayatana-appindicator3-dev. Untuk Windows desktop build, dibutuhkan Visual Studio Build Tools dengan C++ workload dan Rust via rustup.rs. Untuk Android build, dibutuhkan Android Studio dengan SDK 33+, JDK 17, dan Gradle 8.x.', sBody))

# ━━ SECTION 8: BUDGET ━━
story.append(Paragraph('8. BUDGET & RESOURCE', sH1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

story.append(Paragraph('8.1 Development Resources', sH2))
story.append(Paragraph('Proyek ini dikembangkan sebagai open-source project dengan lisensi MIT. Seluruh tools yang digunakan (Next.js, Tauri, Capacitor, React, Prisma, SQLite) bersifat gratis dan open-source. Tidak ada biaya lisensi software yang diperlukan untuk development maupun distribution.', sBody))

budget_data = [
    ['Item', 'Kebutuhan', 'Biaya', 'Keterangan'],
    ['Domain + Hosting', 'nanggroe-os.ai', '~$15/tahun', 'Optional, untuk cloud sync & PWA'],
    ['Google Play Developer', 'Akun developer', '$25 sekali', 'Untuk publish Android app'],
    ['Code Signing (Windows)', 'DigiCert/Sectigo', '~$200/tahun', 'Optional, tanpa ini ada warning SmartScreen'],
    ['Raspberry Pi 4B Kit', 'Hardware testing', '~$75', 'Untuk testing real hardware I/O'],
    ['Arduino Mega + Sensor Kit', 'Hardware testing', '~$50', 'Untuk testing firmware flash'],
    ['Total Minimum', '', '~$365', 'Tanpa code signing: ~$165'],
]
bbt = Table(budget_data, colWidths=[3.5*cm, 3*cm, 2.5*cm, 5.5*cm])
bbt.setStyle(TableStyle([
    ('FONTNAME', (0,0), (-1,0), HEADING_FONT),
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, TABLE_ROW_ODD]),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(bbt)
story.append(Spacer(1, 12))

# Closing
story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=12))
story.append(Paragraph('NANGGROE OS AI — Sovereign AI for Autonomous Robotics', ParagraphStyle('closing', parent=sBody, fontSize=11, leading=16, alignment=TA_CENTER, textColor=HexColor('#3f5f6f'))))
story.append(Paragraph('Author: Mulky Malikul Dhaher | mulkymalikuldhaher@email.com', ParagraphStyle('closingAuthor', parent=sBody, fontSize=9, leading=13, alignment=TA_CENTER, textColor=TEXT_MUTED)))
story.append(Spacer(1, 6))

# Build PDF
doc.build(story)
print(f"PDF generated: {OUT}")
print(f"Size: {os.path.getsize(OUT) / 1024:.1f} KB")
