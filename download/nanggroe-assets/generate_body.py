#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nanggroe OS AI - Production-Ready Implementation Blueprint
Body PDF generation via ReportLab
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Font Registration ──
# NotoSansSC variable font not compatible with ReportLab, using SarasaMonoSC for CJK
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
# Tinos font files are not valid TTF, using Carlito as primary
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))

registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

# Install font fallback for mixed CJK/Latin
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)
from pdf import install_font_fallback
install_font_fallback()

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f1f2f3')
SECTION_BG    = colors.HexColor('#e9ebec')
CARD_BG       = colors.HexColor('#e9eced')
TABLE_STRIPE  = colors.HexColor('#f2f3f4')
HEADER_FILL   = colors.HexColor('#3e5c6b')
COVER_BLOCK   = colors.HexColor('#4f7081')
BORDER        = colors.HexColor('#b8c8cf')
ICON          = colors.HexColor('#346c88')
ACCENT        = colors.HexColor('#c35d3b')
ACCENT_2      = colors.HexColor('#54bf38')
TEXT_PRIMARY   = colors.HexColor('#1e2022')
TEXT_MUTED     = colors.HexColor('#767d80')
SEM_SUCCESS   = colors.HexColor('#397a4f')
SEM_WARNING   = colors.HexColor('#907643')
SEM_ERROR     = colors.HexColor('#9b4c45')
SEM_INFO      = colors.HexColor('#4e769f')

# ── Page setup ──
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ── Styles ──
styles = {}
styles['body'] = ParagraphStyle(
    name='Body', fontName='Carlito', fontSize=10.5,
    leading=18, alignment=TA_JUSTIFY, spaceAfter=6,
    wordWrap='CJK'
)
styles['body_left'] = ParagraphStyle(
    name='BodyLeft', fontName='Carlito', fontSize=10.5,
    leading=18, alignment=TA_LEFT, spaceAfter=6,
    wordWrap='CJK'
)
styles['h1'] = ParagraphStyle(
    name='H1', fontName='Carlito', fontSize=20,
    leading=28, alignment=TA_LEFT, spaceBefore=18, spaceAfter=12,
    textColor=HEADER_FILL
)
styles['h2'] = ParagraphStyle(
    name='H2', fontName='Carlito', fontSize=15,
    leading=22, alignment=TA_LEFT, spaceBefore=14, spaceAfter=8,
    textColor=COVER_BLOCK
)
styles['h3'] = ParagraphStyle(
    name='H3', fontName='Carlito', fontSize=12,
    leading=18, alignment=TA_LEFT, spaceBefore=10, spaceAfter=6,
    textColor=ICON
)
styles['table_header'] = ParagraphStyle(
    name='TableHeader', fontName='Carlito', fontSize=9.5,
    leading=14, alignment=TA_CENTER, textColor=colors.white,
    wordWrap='CJK'
)
styles['table_cell'] = ParagraphStyle(
    name='TableCell', fontName='Carlito', fontSize=9,
    leading=13, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    wordWrap='CJK'
)
styles['table_cell_center'] = ParagraphStyle(
    name='TableCellCenter', fontName='Carlito', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_PRIMARY,
    wordWrap='CJK'
)
styles['caption'] = ParagraphStyle(
    name='Caption', fontName='Carlito', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=6
)
styles['code'] = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=8,
    leading=12, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=12, wordWrap='CJK'
)
styles['callout'] = ParagraphStyle(
    name='Callout', fontName='Carlito', fontSize=10,
    leading=16, alignment=TA_LEFT, textColor=ACCENT,
    leftIndent=18, borderPadding=6, spaceBefore=6, spaceAfter=6
)
styles['bullet'] = ParagraphStyle(
    name='Bullet', fontName='Carlito', fontSize=10.5,
    leading=18, alignment=TA_LEFT, spaceAfter=4,
    leftIndent=24, bulletIndent=12, wordWrap='CJK'
)

# ── TOC Document Template ──
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ── Helper Functions ──
def add_heading(text, style_key, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), styles[style_key])
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_major_section(text):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, 'h1', level=0),
    ]

def make_table(data, col_ratios, caption_text=None):
    """Create a styled table with proportional column widths."""
    col_widths = [r * CONTENT_W for r in col_ratios]
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    elements = [Spacer(1, 18), t]
    if caption_text:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(caption_text, styles['caption']))
    elements.append(Spacer(1, 18))
    return elements

def add_image(path, width_ratio=0.85, caption_text=None):
    """Add an image with proportional width, capped to fit page."""
    if not os.path.exists(path):
        return [Paragraph('[Gambar tidak ditemukan: %s]' % path, styles['body'])]
    from reportlab.lib.utils import ImageReader
    avail_h = PAGE_H - TOP_MARGIN - BOTTOM_MARGIN - 80  # leave room for caption + spacing
    avail_w = CONTENT_W * width_ratio
    img = Image(path, width=avail_w, height=avail_h)
    img.hAlign = 'CENTER'
    elements = [Spacer(1, 12), img]
    if caption_text:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(caption_text, styles['caption']))
    elements.append(Spacer(1, 12))
    return elements

def p(text, style_key='body'):
    return Paragraph(text, styles[style_key])

def ph(text):
    return Paragraph('<b>%s</b>' % text, styles['table_header'])

def pc(text, center=False):
    return Paragraph(text, styles['table_cell_center'] if center else styles['table_cell'])

def bullet(text):
    return Paragraph('<bullet>&bull;</bullet> ' + text, styles['bullet'])

# ── Build Document ──
OUTPUT_DIR = '/home/z/my-project/download/nanggroe-assets'
ASSETS_DIR = OUTPUT_DIR
BODY_PDF = os.path.join(OUTPUT_DIR, 'body.pdf')

doc = TocDocTemplate(
    BODY_PDF, pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
    showBoundary=0
)

story = []

# ── Table of Contents ──
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName='Carlito', fontSize=12,
                   leftIndent=20, leading=20, spaceBefore=6, spaceAfter=2),
    ParagraphStyle(name='TOC2', fontName='Carlito', fontSize=10.5,
                   leftIndent=40, leading=18, spaceBefore=2, spaceAfter=2),
]
story.append(Paragraph('<b>Daftar Isi</b>', ParagraphStyle(
    name='TOCTitle', fontName='Carlito', fontSize=22,
    leading=30, alignment=TA_CENTER, spaceBefore=40, spaceAfter=20,
    textColor=HEADER_FILL
)))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# SECTION 1: RINGKASAN EKSEKUTIF
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('1. Ringkasan Eksekutif'))

story.append(p(
    'Dokumen ini menyajikan blueprint implementasi production-ready untuk <b>Nanggroe OS AI</b>, '
    'sebuah sistem operasi robotika modular otonom yang dirancang untuk mengubah instruksi bahasa alami '
    'manusia menjadi misi robotika yang dapat dieksekusi secara mandiri di dunia nyata. Sistem ini '
    'mengintegrasikan empat pilar teknologi utama: arsitektur sistem operasi robotika dengan deteksi '
    'perangkat keras otomatis, platform drone tricopter amfibi multifungsi, implementasi MVP pemetaan '
    'drone otonom untuk wilayah Aceh Utara, serta strategi AI Voice Agent untuk manajemen properti '
    'pasca-jam kerja.'
))

story.append(p(
    'Nanggroe OS AI dibangun di atas prinsip <b>offline-first</b>, <b>modular by design</b>, dan '
    '<b>deterministic control at the edge</b>. Arsitektur multi-agen cerdas yang menjadi inti sistem '
    'terdiri dari dua agen spesialis: <b>Hermes</b> sebagai perencana strategis yang menjalankan model '
    'LLM 4B untuk pemahaman bahasa alami dan generasi rencana misi, serta <b>PicoClaw</b> sebagai '
    'asisten taktis real-time yang menjalankan model LLM 0.8B untuk monitoring telemetri, deteksi '
    'rintangan, dan aksi darurat. Pemisahan tugas ini memastikan bahwa kestabilan fisik penerbangan '
    'tetap berada di tangan pengontrol deterministik, bukan di bawah kendali AI yang bersifat '
    'non-deterministik.'
))

story.append(p(
    'Platform drone tricopter amfibi dirancang dengan konfigurasi Y-frame yang menawarkan efisiensi '
    'aerodinamis penerbangan maju lebih tinggi dan area pandang kamera yang bebas gangguan baling-baling. '
    'Kemampuan multi-moda memungkinkan drone beroperasi di tiga domain: udara untuk pemetaan fotogrametri, '
    'darat untuk inspeksi tanaman dari bawah tajuk, dan air untuk survei di area rawa-rawa serta pinggir '
    'sungai. Sistem tenaga darurat berbasis panel surya dengan pengontrol MPPT CN3791 memberikan '
    'jaminan kelangsungan hidup komunikasi dan telemetri bahkan ketika baterai utama mengalami kegagalan.'
))

story.append(p(
    'Implementasi MVP difokuskan pada misi pemetaan udara otonom di Kabupaten Aceh Utara, wilayah '
    'dengan tantangan geografis kompleks mulai dari dataran rendah pertanian Lhoksukon yang rawan banjir, '
    'kawasan pesisir Selat Malaka di Dewantara, hingga area pegunungan terpencil di Geuredong Pase. '
    'Infrastruktur telekomunikasi yang tidak konsisten menuntut sistem yang sepenuhnya mandiri dan dapat '
    'dioperasikan tanpa ketergantungan pada jaringan internet. Komputer pendamping Raspberry Pi 5 '
    'dengan 8GB RAM menjalankan seluruh tumpukan perangkat lunak termasuk backend FastAPI, inferensi '
    'LLM lokal via llama-cpp-python, pemrosesan citra OpenCV, dan pangkalan data SQLite.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 2: VISI DAN ARSITEKTUR NANGGROE OS AI
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('2. Visi dan Arsitektur Nanggroe OS AI'))

story.append(add_heading('2.1 Prinsip Desain Inti', 'h2', level=1))

story.append(p(
    'Nanggroe OS AI dibangun berdasarkan sepuluh prinsip desain fundamental yang memastikan sistem '
    'dapat beroperasi secara andal di lingkungan dunia nyata yang tidak terduga. Prinsip pertama dan '
    'paling krusial adalah <b>keselamatan, keandalan, dan kemampuan pemulihan</b> harus selalu '
    'diutamakan di atas fitur canggih. Ini berarti setiap keputusan arsitektural harus mempertimbangkan '
    'skenario kegagalan terburuk dan menyediakan mekanisme fallback yang memadai. Prinsip kedua '
    'menetapkan bahwa <b>kendali real-time harus bersifat deterministik</b>, tidak bergantung pada '
    'proses AI yang latensinya tidak dapat diprediksi. Prinsip ketiga menegaskan bahwa <b>AI digunakan '
    'untuk perencanaan, penalaran, rekomendasi, dan orkestrasi</b>, bukan untuk stabilisasi penerbangan '
    'tingkat rendah yang membutuhkan respons dalam milidetik.'
))

story.append(p(
    'Prinsip-prinsip pendukung meliputi: operasi <b>offline-first</b> di mana semua fungsi inti harus '
    'bekerja tanpa koneksi internet; penyimpanan status sesi, perangkat keras, misi, dan kalibrasi '
    'secara konsisten; deteksi perangkat keras otomatis bila memungkinkan; saran arsitektur paling '
    'sederhana sebelum fitur lanjutan; perlakuan setiap proyek sebagai sistem modular dengan plugin '
    'dan adapter; serta penjelasan tradeoff ketika terdapat beberapa solusi yang tersedia. Prinsip '
    'terakhir mengharuskan sistem untuk tidak menyembunyikan ketidakpastian dan tidak mengklaim fitur '
    'yang tidak didukung oleh perangkat keras saat ini.'
))

# Principles table
principles_data = [
    [ph('No.'), ph('Prinsip'), ph('Deskripsi')],
    [pc('1', True), pc('Keselamatan Utama'), pc('Prefer safety, reliability, dan recoverability dalam setiap keputusan desain.')],
    [pc('2', True), pc('Kendali Deterministik'), pc('Kendali real-time harus deterministik, tidak bergantung pada AI.')],
    [pc('3', True), pc('AI untuk Perencanaan'), pc('AI untuk planning, reasoning, recommendation, bukan stabilisasi motor.')],
    [pc('4', True), pc('Offline-First'), pc('Semua fungsi inti bekerja tanpa koneksi internet.')],
    [pc('5', True), pc('State Persistence'), pc('Simpan session state, hardware state, mission state, calibration state.')],
    [pc('6', True), pc('Auto-Detection'), pc('Deteksi perangkat keras secara otomatis bila memungkinkan.')],
    [pc('7', True), pc('Sederhana Dahulu'), pc('Saran arsitektur paling sederhana sebelum fitur lanjutan.')],
    [pc('8', True), pc('Modular dengan Plugin'), pc('Setiap proyek adalah sistem modular dengan plugin dan adapter.')],
    [pc('9', True), pc('Transparansi'), pc('Jangan sembunyikan ketidakpastian; jelaskan tradeoff.')],
    [pc('10', True), pc('Honest Capability'), pc('Jangan klaim fitur yang tidak didukung hardware saat ini.')],
]
story.extend(make_table(principles_data, [0.06, 0.24, 0.70], 'Tabel 1: Sepuluh Prinsip Desain Nanggroe OS AI'))

story.append(add_heading('2.2 Lapisan Arsitektur Sistem', 'h2', level=1))

story.append(p(
    'Arsitektur Nanggroe OS AI mengimplementasikan model berlapis yang memisahkan tanggung jawab '
    'antarmuka pengguna, koordinasi AI, orkestrasi misi, abstraksi perangkat keras, kendali fisik '
    'perangkat tegar, hingga lapisan pangkalan data lokal. Pemisahan ini mencegah latensi pemrosesan '
    'data tingkat tinggi memengaruhi algoritma kendali motorik real-time drone. Setiap lapisan hanya '
    'berkomunikasi dengan lapisan tepat di atas dan di bawahnya melalui antarmuka yang terdefinisi '
    'dengan baik, menciptakan batasan yang jelas antara komponen sistem.'
))

# Add architecture diagram
story.extend(add_image(
    os.path.join(ASSETS_DIR, 'diagram-architecture.png'),
    width_ratio=0.95,
    caption_text='Gambar 1: Arsitektur Berlapis Nanggroe OS AI - Enam Lapisan Sistem'
))

layers_data = [
    [ph('Lapisan'), ph('Komponen'), ph('Tanggung Jawab')],
    [pc('1. Presentasi', True), pc('Dashboard Web, Android, Telegram Bot, Voice Interface'), pc('Antarmuka pengguna untuk kontrol dan monitoring.')],
    [pc('2. Orkestrasi', True), pc('Mission Engine, Agent Engine, Plugin Manager, Memory Manager'), pc('Koordinasi misi, agen, plugin, dan memori.')],
    [pc('3. Inteligensia', True), pc('Hermes, PicoClaw, LLM Lokal, Vision Models'), pc('Penalaran strategis dan taktis, pemrosesan AI.')],
    [pc('4. Abstraksi (HAL)', True), pc('Hardware Profiles, Adapters, Driver Bridges'), pc('Abstraksi perangkat keras untuk modularitas.')],
    [pc('5. Kendali Perangkat', True), pc('Firmware Comm, Telemetry I/O, Actuator Control'), pc('Komunikasi perangkat tegar dan kontrol aktuator.')],
    [pc('6. Basis Data', True), pc('Logs, Mission History, Calibration Data, Sync Queue'), pc('Penyimpanan lokal dan antrean sinkronisasi.')],
]
story.extend(make_table(layers_data, [0.18, 0.42, 0.40], 'Tabel 2: Lapisan Arsitektur Nanggroe OS AI'))

story.append(add_heading('2.3 Mode Operasi dan Transisi Sistem', 'h2', level=1))

story.append(p(
    'Nanggroe OS AI beroperasi dalam lima mode transisi yang mencerminkan siklus hidup sistem robotika '
    'dari penemuan hingga optimalisasi. Mode <b>Discovery</b> digunakan ketika perangkat keras belum '
    'diketahui, di mana sistem melakukan pemindaian, inferensi, dan proposal konfigurasi. Mode '
    '<b>Planning</b> diaktifkan ketika konsep sudah jelas, menghasilkan arsitektur, modul, dan antarmuka. '
    'Mode <b>Build</b> dimulai saat implementasi berjalan, menghasilkan tugas, struktur file, dan '
    'kerangka kode. Mode <b>Debug</b> digunakan ketika sistem mengalami kegagalan, mendiagnosis gejala, '
    'mengisolasi penyebab, dan merekomendasikan pengujian. Terakhir, mode <b>Optimize</b> diaktifkan '
    'ketika sistem sudah berfungsi, dengan tujuan mengurangi biaya, berat, daya, latensi, dan kompleksitas.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 3: SISTEM MULTI-AGEN
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('3. Sistem Multi-Agen: Hermes dan PicoClaw'))

story.append(add_heading('3.1 Agen Hermes (AI Strategis)', 'h2', level=1))

story.append(p(
    'Agen Hermes berfungsi sebagai "otak" strategis dari Nanggroe OS AI, bertanggung jawab atas '
    'perencanaan tingkat tinggi dan penalaran kompleks. Hermes menjalankan model kuantisasi menengah '
    'seperti <b>Phi-4 4B Q4_K_M</b> yang mengonsumsi daya memori sekitar 2.4 GB RAM. Agen ini '
    'menerima instruksi bahasa alami dari operator manusia melalui berbagai antarmuka (Telegram, '
    'dashboard, suara), kemudian menerjemahkannya menjadi rencana misi yang terstruktur. Proses ini '
    'melibatkan ekstraksi entitas kunci dari perintah, seperti aksi yang diminta, lokasi target, dan '
    'parameter operasional, yang kemudian dikonversi menjadi koordinat rute waypoint pemetaan yang aman.'
))

story.append(p(
    'Hermes juga bertanggung jawab untuk menghitung parameter Ground Sampling Distance (GSD) menggunakan '
    'pemodelan optik kamera, memastikan resolusi citra yang dihasilkan memenuhi standar fotogrametri. '
    'Selain itu, Hermes mengelola komunikasi dengan operator melalui Telegram bot, mengirimkan ringkasan '
    'misi, notifikasi status, dan rekomendasi tindakan selanjutnya. Arsitektur ini sejalan dengan '
    'pendekatan di mana LLM digunakan untuk merancang mesin status hingga yang kompleks untuk robotik, '
    'memastikan kepatuhan terhadap protokol operasional tanpa mengorbankan fleksibilitas dalam '
    'penanganan instruksi yang tidak terstruktur.'
))

story.append(add_heading('3.2 Agen PicoClaw (AI Taktis Real-Time)', 'h2', level=1))

story.append(p(
    'Agen PicoClaw bertindak sebagai "kerebelum" taktis, merupakan lapisan kontrol deterministik dan '
    'waktu nyata yang memantau aliran telemetri secara berkelanjutan. PicoClaw menjalankan model '
    'ultra-ringan berlatensi rendah seperti <b>Qwen 3.5 0.8B Q4_K_M</b> dengan konsumsi memori hanya '
    'sekitar 0.48 GB RAM. Tugas utamanya adalah menerima perintah yang lebih sederhana dari Hermes dan '
    'mengubahnya menjadi sinyal motorik spesifik, serta mendeteksi tanda bahaya fisik, memantau potensi '
    'tabrakan, dan memberikan aksi manuver pencegahan darurat tanpa memengaruhi kestabilan motor.'
))

story.append(p(
    'Penting untuk dicatat bahwa lapisan PicoClaw harus bersifat deterministik untuk memastikan respons '
    'yang cepat dan stabil dalam menjaga keseimbangan drone. Memisahkan proses non-deterministik yang '
    'mungkin dilakukan oleh LLM dari lapisan kontrol rendah ini adalah prinsip desain yang krusial untuk '
    'keselamatan operasional. Ketika terdeteksi rintangan dalam radius aman 2 meter, PicoClaw akan '
    'segera mengabaikan perintah navigasi dari Hermes dan langsung mengirimkan perintah darurat ke '
    'pengontrol penerbangan untuk menghentikan gerakan maju, mengambil tindakan menghindar secara lateral, '
    'dan menstabilkan wahana pada titik koordinat yang aman.'
))

# Multi-agent diagram
story.extend(add_image(
    os.path.join(ASSETS_DIR, 'diagram-multiagent.png'),
    width_ratio=0.90,
    caption_text='Gambar 2: Arsitektur Multi-Agen Hermes dan PicoClaw'
))

story.append(add_heading('3.3 Protokol Komunikasi Antar-Agen', 'h2', level=1))

story.append(p(
    'Komunikasi antara Hermes dan PicoClaw menggunakan protokol publikasi-subskripsi (publish-subscribe) '
    'yang mapan di dunia robotika, serupa dengan yang digunakan oleh Robot Operating System (ROS). '
    'Micro-ROS, versi mikro yang lebih ringan, dirancang khusus untuk lingkungan berdaya terbatas seperti '
    'mikrokontroler, menggunakan middleware Micro XRCE-DDS untuk komunikasi efisien melalui UDP. '
    'Protokol ini memungkinkan kedua agen untuk berkomunikasi secara asinkron tanpa saling menunggu, '
    'mengurangi latensi dan meningkatkan ketanggapan sistem secara keseluruhan.'
))

# Agent comparison table
agent_data = [
    [ph('Parameter'), ph('Hermes (AI Strategis)'), ph('PicoClaw (AI Taktis)')],
    [pc('Model LLM'), pc('Phi-4 4B Q4_K_M'), pc('Qwen 3.5 0.8B Q4_K_M')],
    [pc('Konsumsi RAM'), pc('~2.4 GB'), pc('~0.48 GB')],
    [pc('Latensi Token Pertama'), pc('~180 ms'), pc('~110 ms')],
    [pc('Peran Utama'), pc('Perencanaan strategis, interpretasi bahasa alami'), pc('Monitoring real-time, deteksi rintangan')],
    [pc('Sifat Operasi'), pc('Non-deterministik (perencanaan)'), pc('Deterministik (reaksi cepat)')],
    [pc('Komunikasi'), pc('Menerima input dari operator, mengirim rencana ke PicoClaw'), pc('Menerima perintah dari Hermes, mengirim sinyal ke flight controller')],
    [pc('Prioritas Keselamatan'), pc('Tidak boleh mengontrol motor secara langsung'), pc('Dapat mengoverride Hermes dalam keadaan darurat')],
]
story.extend(make_table(agent_data, [0.22, 0.39, 0.39], 'Tabel 3: Perbandingan Agen Hermes dan PicoClaw'))

# ═══════════════════════════════════════════════════════════════
# SECTION 4: DETEKSI PERANGKAT KERAS OTOMATIS
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('4. Deteksi Perangkat Keras Otomatis'))

story.append(add_heading('4.1 Mekanisme Deteksi USB, I2C, dan SPI', 'h2', level=1))

story.append(p(
    'Kemampuan deteksi perangkat keras otomatis merupakan fondasi yang memungkinkan Nanggroe OS AI '
    'menjadi platform yang sangat fleksibel dan mudah dikonfigurasi ulang. Konsep "auto-detect hardware" '
    'bukanlah sekadar kemampuan untuk mengenali adanya perangkat, melainkan sebuah proses yang lebih '
    'kompleks di mana sistem secara proaktif mengidentifikasi jenis, fungsi, dan spesifikasi perangkat '
    'yang terhubung, lalu menginisialisasi driver dan layanan yang sesuai secara otomatis. Pada saat '
    'boot-up atau saat perangkat baru dipasang, lapisan deteksi melakukan pemindaian bus USB, '
    'mengidentifikasi Vendor ID (VID) dan Product ID (PID) dari setiap perangkat yang terdeteksi, '
    'kemudian mencocekkannya dengan driver atau skrip inisialisasi yang telah ditentukan sebelumnya.'
))

story.append(p(
    'Chip SoC seperti ESP32-S3 memiliki modul USB On-The-Go (OTG) yang memungkinkan mikrokontroler '
    'berfungsi sebagai host USB, sehingga dapat mengelola dan memindai perangkat-perangkat yang '
    'terhubung kepadanya. Untuk protokol lainnya, sistem melakukan pemindaian I2C bus untuk mendeteksi '
    'sensor pada alamat tertentu, probe SPI untuk perangkat berkecepatan tinggi, dan pemantauan port '
    'serial UART untuk perangkat seperti modul GPS dan GSM. Konsep desain modular ini sangat mirip '
    'dengan standar plug-and-play yang dikembangkan melalui proyek Jacdac, yang menyediakan kerangka '
    'kerja untuk komputasi fisik yang modular dengan protokol I2C, SPI, UART, dan USB.'
))

# Detection table
detect_data = [
    [ph('Komponen'), ph('Protokol'), ph('Metode Identifikasi dan Inisialisasi')],
    [pc('Kamera'), pc('USB, SPI, Serial'), pc('Sistem memuat driver V4L2 dan mulai menerima stream video untuk modul visi.')],
    [pc('Sensor GPS'), pc('Serial (UART)'), pc('Sistem mencari sinyal NMEA pada port serial. Jika valid, modul navigasi diaktifkan.')],
    [pc('Modul GSM'), pc('Serial (AT Command)'), pc('Sistem mengirimkan perintah AT dasar untuk memverifikasi konektivitas.')],
    [pc('Panel Surya'), pc('ADC'), pc('Sensor tegangan/suhu dibaca melalui ADC, data masuk ke modul manajemen daya.')],
    [pc('Roda Darat'), pc('GPIO'), pc('Pin GPIO dikonfigurasi sebagai I/O, modul land-based controller diaktifkan.')],
    [pc('BME280'), pc('I2C (0x76/0x77)'), pc('Pemindaian alamat I2C, inisialisasi pembacaan suhu, kelembapan, tekanan.')],
    [pc('MPU6050'), pc('I2C (0x68)'), pc('Pemindaian alamat I2C, inisialisasi pembacaan akselerometer dan giroskop.')],
]
story.extend(make_table(detect_data, [0.15, 0.20, 0.65], 'Tabel 4: Mekanisme Deteksi Perangkat Keras'))

story.append(add_heading('4.2 Hardware Abstraction Layer (HAL)', 'h2', level=1))

story.append(p(
    'Hardware Abstraction Layer (HAL) menyediakan antarmuka terpadu di atas berbagai papan dan periferal, '
    'memungkinkan bahasa misi yang sama untuk dipetakan ke perangkat fisik yang berbeda melalui adapter. '
    'Setiap adapter wajib mematuhi kontrak antarmuka terpadu yang mencakup metode: initialize() untuk '
    'mempersiapkan parameter memori, detect() untuk pembacaan handshake fisik, arm() untuk sinyal '
    'otorisasi keselamatan, execute() untuk eksekusi rute waypoint, pause() untuk penangguhan sementara, '
    'stop() untuk penghentian aman, dan report_status() untuk pengiriman data telemetri. Pendekatan ini '
    'memastikan bahwa penambahan perangkat keras baru hanya memerlukan pengembangan adapter baru tanpa '
    'perlu mengubah kode inti sistem operasi.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 5: PLATFORM DRONE TRIICOPTER AMFIBI
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('5. Platform Drone Tricopter Amfibi'))

story.append(add_heading('5.1 Konfigurasi Mekanis Y-Frame', 'h2', level=1))

story.append(p(
    'Arsitektur mekanis platform udara otonom ini dirancang menggunakan konfigurasi rangka Y-frame '
    'tricopter, yang menawarkan efisiensi aerodinamis penerbangan maju lebih tinggi dan area pandang '
    'kamera primer yang bebas dari gangguan baling-baling dibandingkan dengan konfigurasi kuadrokopter '
    'standar. Rangka fisik terdiri dari tiga lengan pendukung motor yang diposisikan secara simetris '
    'dengan sudut pembagian masing-masing sebesar 120 derajat. Struktur pendorong utama ditenagai oleh '
    'tiga unit motor brushless DC tipe A2212 1400KV yang dikombinasikan dengan baling-baling '
    'counter-rotating untuk meminimalkan torsi giroskopis dan dikoordinasikan oleh pengontrol kecepatan '
    'elektronik (ESC).'
))

story.append(p(
    'Sistem pengendalian sumbu yaw pada tricopter tidak mengandalkan perbedaan kecepatan putaran motor '
    'seperti pada kuadrokopter, melainkan menggunakan mekanisme kemiringan aktif (tilt mechanism) pada '
    'motor bagian belakang. Motor belakang dipasang pada dudukan poros pivot serat karbon yang ditopang '
    'oleh bantalan bola tipe MR84ZZ untuk mereduksi gesekan mekanis dan osilasi. Kemiringan dudukan '
    'motor dikendalikan secara dinamis oleh servo digital berbasis gir logam performa tinggi, MG90S, '
    'dengan sudut kemiringan mekanis mencapai +/-30 derajat. Untuk meminimalkan beban kerja servo '
    'belakang saat penerbangan maju berkecepatan tinggi, dipasang sirip penstabil vertikal berbahan '
    'serat karbon ringan pada bagian buritan rangka.'
))

# Tricopter diagram
story.extend(add_image(
    os.path.join(ASSETS_DIR, 'diagram-tricopter.png'),
    width_ratio=0.80,
    caption_text='Gambar 3: Skematik Konfigurasi Tricopter Y-Frame'
))

# Mechanical specs table
mech_data = [
    [ph('Komponen'), ph('Spesifikasi'), ph('Protokol'), ph('Peran Sistem')],
    [pc('Motor Brushless Utama'), pc('A2212 1400KV / Efisiensi Maks 80%'), pc('PWM (50-400 Hz)'), pc('Propulsi dan Gaya Angkat')],
    [pc('Servo Kemiringan Yaw'), pc('MG90S Digital Metal-Gear / Torsi 2.2 kg.cm'), pc('PWM (50-333 Hz)'), pc('Kendali Vektor Gaya Dorong')],
    [pc('Unit Pengendali Utama'), pc('Arduino Mega 2560 R3 (16 MHz)'), pc('I2C dan Serial UART'), pc('Kendali Sikap Deterministik')],
    [pc('Komputer Pendamping'), pc('Raspberry Pi 5 (LPDDR4X 8GB)'), pc('USB 3.0 dan Serial UART'), pc('Inferensi AI dan Navigasi')],
    [pc('Sensor Navigasi'), pc('GY-521 MPU6050 Accel/Gyro'), pc('I2C Fast-Mode (0x68)'), pc('Estimasi Sikap dan Orientasi')],
    [pc('Sistem Roda Darat'), pc('Roda Karet Mikro-DC High-Reduction'), pc('H-Bridge (PWM)'), pc('Penjelajahan Darat Efisien')],
    [pc('Rangka Apung Air'), pc('EPS Kepadatan Tinggi Berlapis Karbon'), pc('Fisik Pasif'), pc('Redundansi Apung dan Navigasi Air')],
]
story.extend(make_table(mech_data, [0.18, 0.28, 0.22, 0.32], 'Tabel 5: Spesifikasi Komponen Mekanis Tricopter'))

story.append(add_heading('5.2 Kemampuan Multi-Moda Operasional', 'h2', level=1))

story.append(p(
    'Fitur unik dari platform ini adalah kemampuannya untuk beroperasi di tiga domain: udara, darat, '
    'dan air. Untuk operasi darat, set sistem ban baja ringan dipasang pada rangka drone, dilengkapi '
    'dengan motor independen yang dikendalikan oleh servo atau motor DC. Ketika drone mendarat, PicoClaw '
    'beralih ke modus kontrol land-based, menggunakan data dari sensor IMU untuk menjaga keseimbangan '
    'dan menggerakkan drone. Mode merayap darat memungkinkan inspeksi tanaman dari bawah tajuk dengan '
    'konsumsi daya yang jauh lebih rendah dibandingkan mode terbang, secara signifikan menghemat '
    'kapasitas energi baterai utama.'
))

story.append(p(
    'Untuk operasi di air, sistem pelampung dari bahan expanded polystyrene (EPS) berlapis serat karbon '
    'berkepadatan tinggi dipasang di bawah fuselage, memberikan daya apung nominal 1.5 kali lebih besar '
    'dari berat total lepas landas wahana. Navigasi di atas permukaan air dilakukan dengan memanfaatkan '
    'defleksi mekanis servo belakang sebagai kemudi kemiringan air-boat style, sedangkan dorongan '
    'navigasi dihasilkan oleh dorongan asimetris kedua motor depan. Fleksibilitas ini memungkinkan drone '
    'melakukan survei di area yang sulit diakses seperti rawa-rawa atau pinggir sungai yang tidak dapat '
    'dicapai oleh drone udara biasa. Setiap perubahan moda operasional dipicu secara otomatis oleh sensor '
    'yang mendeteksi kontak dengan permukaan atau perubahan gaya angkat.'
))

story.append(add_heading('5.3 Sistem Tenaga Darurat dan MPPT CN3791', 'h2', level=1))

story.append(p(
    'Dalam skenario darurat seperti kegagalan daya baterai utama atau pendaratan darurat di tengah area '
    'persawahan terisolasi, wahana mengandalkan sistem pembangkit energi surya mandiri. Panel surya '
    'monokristalin berbobot ringan dengan lapisan fleksibel menghasilkan tegangan nominal sekitar 12V. '
    'Arus listrik diatur oleh modul pengisi daya berbasis chip buck-converter CN3791 yang mengimplementasikan '
    'metode Maximum Power Point Tracking (MPPT). Penggunaan pengontrol MPPT berbasis sirkuit switching '
    'PWM 300 kHz memastikan transfer daya tetap efisien hingga mencapai 95%, jauh mengungguli regulator '
    'linier konvensional seperti TP4056 yang membuang kelebihan tegangan menjadi panas.'
))

story.append(p(
    'Modul pengisi daya dikonfigurasi menggunakan arsitektur manajemen daya jalur ganda (Narrow Voltage '
    'DC / NVDC). Melalui desain ini, beban sistem terhubung secara paralel dengan baterai penyimpan daya. '
    'Sirkuit logika internal CN3791 mengarahkan arus keluaran panel surya untuk menyuplai beban operasional '
    'sekaligus mengisi daya baterai secara simultan. Apabila intensitas cahaya matahari menurun secara '
    'drastis, sirkuit proteksi jalur ganda mengalihkan suplai daya dari baterai tanpa interupsi tegangan, '
    'menjaga sistem komputer edge dan telemetri GSM tetap beroperasi untuk memancarkan koordinat lokasi '
    'darurat. Sistem manajemen baterai juga mengimplementasikan logika cerdas untuk menentukan kapan '
    'harus mengisi baterai, mengalihkan beban, atau memasuki mode hemat daya.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 6: IMPLEMENTASI MVP ACEH UTARA
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('6. Implementasi MVP: Pemetaan Drone Otonom di Aceh Utara'))

story.append(add_heading('6.1 Spesifikasi Perangkat Keras', 'h2', level=1))

story.append(p(
    'Implementasi MVP Nanggroe OS AI untuk pemetaan drone otonom di Kabupaten Aceh Utara menggunakan '
    'konfigurasi perangkat keras yang telah divalidasi untuk kondisi operasional di wilayah tersebut. '
    'Komputer pendamping Raspberry Pi 5 dengan 8GB RAM LPDDR4X menjadi pusat komputasi AI lokal, '
    'pemrosesan citra, manajemen pangkalan data, dan penanganan protokol komunikasi. Pengontrol '
    'penerbangan Holybro Pixhawk 6C berfungsi sebagai FCB utama yang mengoperasikan perangkat tegar '
    'autopilot secara deterministik, terhubung melalui USB CDC atau UART Serial.'
))

story.append(p(
    'Modul GPS Holybro M8N GNSS menyediakan data posisi melalui UART Serial atau I2C Bus, dilengkapi '
    'kompas magnetometer, buzzer, tombol pengaman, dan lampu indikator LED. Kamera Sony Alpha ILX-LR1 '
    'dengan sensor 61 Megapiksel bertindak sebagai sensor muatan pemetaan utama, terhubung melalui '
    'USB Type-C dengan pemicu rana GPIO. Sensor sekunder Bosch BME280 memantau suhu udara, kelembapan, '
    'dan tekanan atmosfer lokal secara real-time melalui bus I2C pada alamat 0x76 atau 0x77. Komponen '
    'yang diasumsikan tersedia meliputi SiK Telemetry Radio sebagai jembatan komunikasi nirkabel dan '
    'baterai LiPo 4S 5000mAh sebagai sumber daya utama.'
))

# Hardware specs table
hw_data = [
    [ph('Perangkat Keras'), ph('Port/Protokol'), ph('Status'), ph('Fungsi Utama')],
    [pc('Raspberry Pi 5 (8GB)'), pc('Komputer Pendamping'), pc('Terdeteksi'), pc('Komputasi AI, pemrosesan citra, database, komunikasi')],
    [pc('Holybro Pixhawk 6C'), pc('USB CDC / UART Serial'), pc('Terdeteksi'), pc('Flight controller, autopilot deterministik')],
    [pc('Holybro M8N GNSS'), pc('UART Serial / I2C'), pc('Terdeteksi'), pc('GPS, kompas, buzzer, LED indikator')],
    [pc('Sony Alpha ILX-LR1'), pc('USB Type-C / GPIO Trigger'), pc('Terdeteksi'), pc('Kamera pemetaan 61MP')],
    [pc('Bosch BME280'), pc('I2C (0x76/0x77)'), pc('Terdeteksi'), pc('Sensor suhu, kelembapan, tekanan atmosfer')],
    [pc('SiK Telemetry Radio'), pc('USB-Serial FTDI (57600)'), pc('Diasumsikan'), pc('Komunikasi nirkabel ke stasiun darat')],
    [pc('LiPo 4S 5000mAh'), pc('Analog Sensor Daya'), pc('Terdeteksi'), pc('Sumber daya utama drone')],
]
story.extend(make_table(hw_data, [0.22, 0.22, 0.13, 0.43], 'Tabel 6: Spesifikasi Perangkat Keras MVP Aceh Utara'))

story.append(add_heading('6.2 Komponen Kritis yang Dibutuhkan', 'h2', level=1))

story.append(p(
    'Sebelum memberikan otorisasi untuk memulai misi penerbangan otonom penuh, Nanggroe OS AI secara '
    'proaktif melakukan audit kelayakan fisik. Berdasarkan hasil pemindaian sistem, beberapa komponen '
    'kritis diidentifikasi sebagai elemen yang belum terdeteksi namun mutlak dibutuhkan. Pertama, '
    '<b>Penerima RTK GNSS Base Station</b> diperlukan karena tanpa koreksi koordinat real-time, akurasi '
    'penandaan geografis citra hanya berkisar 2 hingga 5 meter, yang tidak memadai untuk pemetaan tata '
    'ruang presisi tinggi. Kedua, <b>Sensor Penghindar Rintangan Lidar</b> dibutuhkan di wilayah '
    'perbukitan Geuredong Pase guna mencegah tabrakan fisik drone dengan tajuk pohon atau kontur bukit. '
    'Ketiga, <b>Sistem Catu Daya Cadangan</b> berupa modul BEC cadangan direkomendasikan guna '
    'meminimalkan risiko brownout saat CPU mengalami beban komputasi AI puncak. Keempat, <b>Pemicu '
    'Mekanis Muatan Lepas</b> diperlukan jika drone ditugaskan untuk membawa logistik darurat pasca-bencana.'
))

story.append(add_heading('6.3 Rencana Perkabelan Pixhawk-Raspberry Pi', 'h2', level=1))

story.append(p(
    'Integrasi antara pengontrol penerbangan Pixhawk 6C dengan komputer pendamping Raspberry Pi 5 '
    'memanfaatkan komunikasi serial berkecepatan tinggi guna mencegah latensi telemetri. Konfigurasi '
    'pin interkoneksi fisik menggunakan port TELEM1 pada Pixhawk yang terhubung ke GPIO header Raspberry '
    'Pi 5. Jalur UART7_TX pada pin 2 Pixhawk terhubung ke pin GPIO15 (RXD) pada Raspberry Pi untuk '
    'menerima data telemetri MAVLink. Jalur UART7_RX pada pin 3 Pixhawk terhubung ke pin GPIO14 (TXD) '
    'untuk mengirimkan perintah misi otonom. Pengendalian aliran data keras (hardware flow control) '
    'diimplementasikan melalui jalur CTS dan RTS pada pin 4 dan 5 Pixhawk yang terhubung ke GPIO16 '
    'dan GPIO17 pada Raspberry Pi. Selain komunikasi serial, bus I2C4 pada Pixhawk terhubung ke jalur '
    'I2C1 pada Raspberry Pi untuk mendukung sensor BME280 dan kompas magnetometer.'
))

# Wiring table
wire_data = [
    [ph('Sinyal Pixhawk'), ph('Pin Pixhawk'), ph('Pin RPi 5'), ph('Fungsi')],
    [pc('VCC (+5V)'), pc('Pin 1 (TELEM1)'), pc('Pin 2/4'), pc('Catu daya utama Raspberry Pi 5')],
    [pc('UART7_TX'), pc('Pin 2 (TELEM1)'), pc('Pin 10 (GPIO15)'), pc('Data telemetri MAVLink ke RPi')],
    [pc('UART7_RX'), pc('Pin 3 (TELEM1)'), pc('Pin 8 (GPIO14)'), pc('Perintah misi dari RPi ke Pixhawk')],
    [pc('UART7_CTS'), pc('Pin 4 (TELEM1)'), pc('Pin 36 (GPIO16)'), pc('Hardware flow control')],
    [pc('UART7_RTS'), pc('Pin 5 (TELEM1)'), pc('Pin 11 (GPIO17)'), pc('Hardware flow control')],
    [pc('GND'), pc('Pin 6 (TELEM1)'), pc('Pin 6/14'), pc('Common ground')],
    [pc('I2C4_SCL'), pc('Pin 2 (I2C)'), pc('Pin 5 (GPIO3)'), pc('Clock line sensor BME280/Kompas')],
    [pc('I2C4_SDA'), pc('Pin 3 (I2C)'), pc('Pin 3 (GPIO2)'), pc('Data line sensor BME280/Kompas')],
]
story.extend(make_table(wire_data, [0.18, 0.22, 0.22, 0.38], 'Tabel 7: Pemetaan Pin Interkoneksi Pixhawk 6C - Raspberry Pi 5'))

story.append(add_heading('6.4 Tumpukan Perangkat Lunak dan Backend FastAPI', 'h2', level=1))

story.append(p(
    'Tumpukan perangkat lunak pada komputer pendamping Raspberry Pi 5 dikonfigurasi menggunakan sistem '
    'operasi Linux Ubuntu Server 24.04 LTS (64-bit Edition) versi Lite tanpa antarmuka grafis untuk '
    'menghemat alokasi memori RAM dan siklus prosesor CPU. Perangkat tegar pada Pixhawk 6C memuat '
    'ArduPilot Copter versi stabil terbaru dengan dukungan telemetri serial MAVLink2. Arsitektur '
    'backend dijalankan di atas kerangka kerja FastAPI dengan server ASGI Uvicorn, memanfaatkan sifat '
    'asinkronus untuk menangani komunikasi serial autopilot secara defensif agar tidak menghambat aliran '
    'eksekusi antrean utama (async event loop).'
))

story.append(p(
    'Pembacaan data dari pustaka sinkronus seperti pymavlink atau smbus2 dijalankan di dalam thread '
    'pool terpisah menggunakan abstraksi asyncio.to_thread(). Untuk pangkalan data lokal, SQLite '
    'dikonfigurasi dengan performa tinggi: mode WAL (Write-Ahead Log) diaktifkan untuk konkurensi '
    'pembacaan dan penulisan simultan, synchronous=NORMAL untuk meminimalkan latensi tulis, dan '
    'temp_store=MEMORY untuk menyimpan tabel temporer di RAM. Konfigurasi ini mencegah galat "database '
    'is locked" yang umum terjadi pada operasi konkuren. Inferensi LLM lokal diimplementasikan '
    'menggunakan pustaka llama-cpp-python yang mengakses akselerasi instruksi prosesor ARM NEON pada '
    'Raspberry Pi 5, dengan model berformat GGUF yang dibaca via memory mapping (mmap) untuk '
    'memperpanjang umur pakai media penyimpanan eksternal.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 7: EDGE AI DAN PEMROSESAN BAHASA ALAMI
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('7. Kecerdasan Buatan di Tepi Jaringan (Edge AI)'))

story.append(add_heading('7.1 Model LLM Lokal dan Kuantisasi', 'h2', level=1))

story.append(p(
    'Seluruh proses inferensi AI dijalankan secara lokal di dalam perangkat (edge computing) tanpa '
    'ketergantungan pada jaringan internet. Mesin kecerdasan buatan utama menggunakan llama-cpp-python '
    'yang dioptimalkan untuk memproses model bahasa besar (LLM) berformat GGUF langsung dari media '
    'penyimpanan eksternal berupa flash drive USB 3.0 atau SSD portabel. Format GGUF merupakan format '
    'model terkuantisasi yang dioptimalkan untuk inferensi di perangkat dengan memori terbatas. Proses '
    'kuantisasi menurunkan presisi numerik dari 16-bit floating-point ke 8-bit atau 4-bit integer, '
    'yang meskipun menyebabkan sedikit penurunan akurasi, memberikan keuntungan besar dalam ukuran '
    'model dan kecepatan inferensi.'
))

# LLM models table
llm_data = [
    [ph('Model Generatif'), ph('Ukuran GGUF'), ph('Penggunaan RAM'), ph('Latensi Token Pertama'), ph('Kecepatan Generasi')],
    [pc('Gemma 3 270M (Q8_0)'), pc('~290 MB'), pc('~410 MB'), pc('~95 ms'), pc('45-55 tok/detik')],
    [pc('Qwen 3.5 0.8B (Q4_K_M)'), pc('~510 MB'), pc('~720 MB'), pc('~110 ms'), pc('28-38 tok/detik')],
    [pc('Gemma 3 1B (Q4_K_M)'), pc('~680 MB'), pc('~920 MB'), pc('~140 ms'), pc('18-25 tok/detik')],
    [pc('Qwen 3.5 1.5B (Q5_K_M)'), pc('~1.1 GB'), pc('~1.6 GB'), pc('~180 ms'), pc('12-18 tok/detik')],
    [pc('Phi-4 4B (Q4_K_M)'), pc('~2.4 GB'), pc('~2.4 GB'), pc('~300 ms'), pc('6-10 tok/detik')],
]
story.extend(make_table(llm_data, [0.24, 0.15, 0.17, 0.22, 0.22], 'Tabel 8: Perbandingan Model LLM Lokal untuk Edge AI'))

story.append(add_heading('7.2 Antarmuka Suara Offline', 'h2', level=1))

story.append(p(
    'Antarmuka perintah suara dirancang menggunakan jalur pemrosesan terdistribusi lokal yang sepenuhnya '
    'offline. Rekaman instruksi suara dari pengguna ditranskripsikan menjadi data teks mentah menggunakan '
    'sistem pengenalan suara otomatis (ASR) berbasis Vosk atau faster-whisper versi ringkas. Setelah '
    'teks transkripsi diperoleh, LLM lokal memilah intensi perintah untuk memformulasikan instruksi '
    'penerbangan, koordinat pemetaan, atau pelepasan material ke dalam format JSON terstruktur. Umpan '
    'balik operasional kemudian diubah kembali menjadi suara ucapan alami oleh sistem sintesis suara '
    'lokal (TTS) berbasis Piper. Nada suara pengumuman sistem dikonfigurasi secara ketat dengan '
    'karakteristik: pendek, langsung, tingkat ambiguitas rendah, dan berorientasi pada tindakan fisik '
    '(action-oriented).'
))

story.append(add_heading('7.3 Visi Komputer dan Penghindaran Rintangan', 'h2', level=1))

story.append(p(
    'Sistem visi komputer diimplementasikan dengan memanfaatkan pustaka OpenCV dan kerangka kerja '
    'Google MediaPipe. Kamera menangkap aliran video beresolusi 640x480 piksel pada frekuensi 30 fps. '
    'Kerangka kerja MediaPipe memetakan geometri wajah pengguna secara real-time untuk mendeteksi '
    'koordinat landmark wajah, dengan kalkulasi posisi dipusatkan pada titik koordinat hidung (Landmark '
    '0). Algoritma pelacakan menghitung vektor pergeseran spasial dari pusat bingkai gambar, yang '
    'diproses oleh loop kontrol visual di komputer pendamping untuk mengirimkan perintah koreksi sudut '
    'putaran yaw dan kemiringan pitch secara real-time ke papan Arduino.'
))

story.append(p(
    'Untuk tugas penghindaran rintangan, model yang lebih kecil dan dioptimalkan seperti versi '
    'modifikasi arsitektur YOLO digunakan bersama sensor ultrasonik. Framework TensorFlow Lite Micro '
    '(TFLM) menjadi kerangka kerja utama untuk mengimplementasikan model-model ini di perangkat embedded, '
    'dengan target kecepatan inferensi lebih dari 30 FPS untuk memastikan respons yang lancar. Agen '
    'taktis PicoClaw memantau aliran video kamera depan secara konstan bersama sensor ultrasonik untuk '
    'mendeteksi potensi tabrakan. Jika terdeteksi rintangan dalam radius aman 2 meter, PicoClaw '
    'langsung mengirimkan perintah darurat ke Arduino untuk menghentikan gerakan maju dan menstabilkan '
    'wahana pada titik koordinat yang aman.'
))

# AI models table
ai_data = [
    [ph('Komponen AI'), ph('Model/Format'), ph('Peran Utama'), ph('Tantangan Utama')],
    [pc('LLM Bahasa'), pc('Phi-4 4B / GGUF'), pc('Pemrosesan instruksi natural language, generasi rencana misi'), pc('Performa inferensi, penggunaan memori tinggi')],
    [pc('Face Tracking'), pc('YOLOv5-based / RICE-YOLO'), pc('Deteksi dan pelacakan wajah untuk interaksi/pengawasan'), pc('Latensi harus <33ms untuk 30fps')],
    [pc('Obstacle Avoidance'), pc('Custom CNN / TFLM'), pc('Deteksi rintangan untuk navigasi aman'), pc('Model sangat cepat dan akurat diperlukan')],
    [pc('Online Learning'), pc('TinyReptile-inspired'), pc('Adaptasi model AI dengan data misi sebelumnya'), pc('Memori non-volatile, algoritma adaptasi efisien')],
]
story.extend(make_table(ai_data, [0.16, 0.20, 0.34, 0.30], 'Tabel 9: Komponen AI Lokal dan Tantangan Implementasi'))

# ═══════════════════════════════════════════════════════════════
# SECTION 8: PERTANIAN PRESISI
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('8. Pertanian Presisi: Pemetaan dan Penyebaran Material'))

story.append(add_heading('8.1 Fotogrametri dan Pemetaan Lahan', 'h2', level=1))

story.append(p(
    'Aplikasi pertanian presisi merupakan penerapan fungsional paling signifikan dari drone multifungsi '
    'ini, mengubahnya dari sekadar platform teknologi menjadi alat produktif yang memberikan nilai '
    'ekonomi dan lingkungan. Proses pemetaan didasarkan pada teknik fotogrametri Struktur dari Gerakan '
    '(SfM), di mana serangkaian foto yang tumpang tindih tinggi diambil dari ketinggian yang konstan, '
    'kemudian diolah untuk membangun model 3D permukaan lahan. Hasilnya mencakup peta ortofoto yang '
    'telah dikoreksi distorsi dan Digital Elevation Models (DEM). Akurasi pemetaan sangat bergantung '
    'pada Ground Sample Distance (GSD) dan kualitas sistem navigasi, di mana penggunaan receiver GPS '
    'RTK memungkinkan pencapaian akurasi posisi centimeter-level.'
))

story.append(p(
    'Setelah peta terbentuk, analisis lebih lanjut dilakukan menggunakan algoritma seperti PPPM '
    '(Phenology- and Pixel-Based Paddy Rice Mapping) yang bekerja dengan mendeteksi sinyal genangan '
    'air di lahan sawah selama fase transplantasi. Dengan menganalisis citra multispektral dan '
    'menggunakan indeks seperti LSWI (Land Surface Water Index), sistem dapat secara otomatis '
    'mengidentifikasi area yang ditanami padi dan menghitung luasannya. Selain itu, indeks vegetasi '
    'NDVI (Normalized Difference Vegetation Index) dapat dihitung dari citra optikal untuk menilai '
    'kesehatan tanaman dan mendeteksi area yang kurang subur. Perhitungan luas area menggunakan formula '
    'Shoelace (Teorema Green) pada koordinat batas poligon lahan, sementara jarak antar-titik koordinat '
    'dihitung menggunakan persamaan Haversine.'
))

story.append(add_heading('8.2 Perencanaan Jalur Sapuan (Coverage Path Planning)', 'h2', level=1))

story.append(p(
    'Aplikasi pemetaan pertanian dijalankan secara otonom menggunakan metode Coverage Path Planning '
    '(CPP). Pengguna menentukan batas-batas poligon lahan sawah melalui antarmuka peta pada aplikasi '
    'kendali. Komputer pendamping memproses poligon tersebut untuk menghasilkan jalur penerbangan zigzag '
    'yang dihitung secara matematis berdasarkan luas sapuan lensa kamera dan tinggi terbang operasional. '
    'Selama penjelajahan sirkuit ini, komputer pendamping memicu pengambilan gambar secara berkala, '
    'membubuhkan data tag koordinat GPS pada metadata foto, dan menyimpannya ke dalam flash disk lokal. '
    'Parameter GSD dihitung menggunakan pemodelan optik kamera, memastikan resolusi citra yang dihasilkan '
    'memenuhi standar fotogrametri yang dibutuhkan untuk pemetaan presisi tinggi.'
))

story.append(add_heading('8.3 Sistem Pelepasan Muatan Presisi', 'h2', level=1))

story.append(p(
    'Untuk tugas penyebaran material seperti pupuk atau benih, pengguna menentukan koordinat titik '
    'jatuh target pada visualisasi peta. Sistem navigasi otonom memandu wahana menuju titik koordinat '
    'tersebut. Ketika wahana berada tepat di atas target dengan batas toleransi akurasi koordinat '
    '+/-0.5 meter, komputer pendamping mengirimkan perintah digital ke sirkuit servo pelepasan barang. '
    'Mekanisme pelepasan beban dibangun menggunakan mikrokontroler Arduino Nano dan servo digital '
    'TowerPro MG90D yang dikendalikan nirkabel. Servo menggerakkan latch yang menahan beban, dan ketika '
    'perintah pelepasan diterima, servo berputar untuk membuka latch, memungkinkan material jatuh keluar. '
    'Implementasi ini menghadapi tantangan teknis termasuk variabilitas material, kondisi aerodinamika, '
    'dan interferensi elektromagnetik (EMI) dari motor drone yang dapat mengganggu komunikasi nirkabel '
    'internal. Desain PCB yang baik dengan isolasi dan filtering memadai menjadi krusial untuk operasi '
    'yang andal.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 9: ANTARMUKA PENGGUNA
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('9. Antarmuka Pengguna dan Sistem Kontrol'))

story.append(add_heading('9.1 Dashboard Web dan Android', 'h2', level=1))

story.append(p(
    'Antarmuka dasbor MVP Nanggroe OS AI dirancang dengan pendekatan responsif agar dapat diakses '
    'secara optimal dari komputer base station maupun perangkat seluler Android di lapangan. Dasbor '
    'memetakan visualisasi telemetri instan, jalur penerbangan real-time, status kesehatan perangkat '
    'keras, serta konsol interaktif untuk berkomunikasi dengan agen Hermes. Bagian utama dasbor '
    'mencakup: overview untuk ringkasan status sistem, panel telemetri untuk data GPS, baterai, dan '
    'kualitas sinyal, peta interaktif untuk perencanaan misi, timeline misi untuk tracking progres, '
    'panel kesehatan perangkat, panel AI chat untuk interaksi dengan Hermes, dan feed notifikasi untuk '
    'peringatan dan alert. Dashboard dibangun menggunakan stack React/Next.js dengan koneksi WebSocket '
    'untuk pembaruan data real-time.'
))

story.append(add_heading('9.2 Bot Telegram', 'h2', level=1))

story.append(p(
    'Bot Telegram berfungsi sebagai antarmuka kendali sekunder dan saluran komando taktis jarak jauh '
    'serta sistem notifikasi darurat pasca-misi. Perintah yang didukung meliputi: /status untuk '
    'mendapatkan ringkasan status drone, /map untuk memicu pemetaan, /mission untuk mengelola misi, '
    '/return untuk mengaktifkan Return-to-Home, /photo untuk mengambil foto, /logs untuk mengakses '
    'log misi, /calibrate untuk menjalankan kalibrasi sensor, dan /help untuk bantuan. Perintah kritis '
    'memerlukan konfirmasi untuk mencegah eksekusi tidak sengaja, dan semua tindakan dicatat dalam log '
    'untuk audit trail. Bot Telegram diintegrasikan melalui server backend Python yang berkomunikasi '
    'dengan API Telegram menggunakan library telepot, bertindak sebagai perantara antara pengguna dan '
    'drone melalui modul GSM/GPRS yang terintegrasi.'
))

# Telegram commands table
tg_data = [
    [ph('Perintah'), ph('Kategori'), ph('Deskripsi')],
    [pc('/status', True), pc('Monitoring'), pc('Menampilkan ringkasan status drone: baterai, GPS, kesehatan sensor.')],
    [pc('/map', True), pc('Misi'), pc('Memulai misi pemetaan pada area yang ditentukan.')],
    [pc('/mission', True), pc('Misi'), pc('Mengelola misi aktif: mulai, henti, jeda, lanjutkan.')],
    [pc('/return', True), pc('Keselamatan'), pc('Mengaktifkan Return-to-Home secara manual.')],
    [pc('/photo', True), pc('Pengambilan Data'), pc('Mengambil foto udara pada posisi saat ini.')],
    [pc('/logs', True), pc('Data'), pc('Mengakses log misi terbaru dan statistik kinerja.')],
    [pc('/calibrate', True), pc('Kalibrasi'), pc('Menjalankan kalibrasi sensor kompas atau akselerometer.')],
    [pc('/help', True), pc('Bantuan'), pc('Menampilkan daftar perintah dan panduan penggunaan.')],
]
story.extend(make_table(tg_data, [0.12, 0.18, 0.70], 'Tabel 10: Perintah Bot Telegram Nanggroe OS AI'))

# ═══════════════════════════════════════════════════════════════
# SECTION 10: AI VOICE AGENT
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('10. AI Voice Agent untuk Manajemen Properti'))

story.append(add_heading('10.1 Analisis Pasar dan Posisi Strategis', 'h2', level=1))

story.append(p(
    'Selain aplikasi drone dan pertanian presisi, Nanggroe OS AI juga dapat dikembangkan sebagai '
    'platform AI Voice Agent untuk niche manajemen properti, khususnya penanganan darurat pemeliharaan '
    'pasca-jam kerja (after-hours emergency maintenance triage). Analisis pasar komparatif antara sektor '
    'manajemen properti dan rumah duka menunjukkan bahwa manajemen properti menawarkan peluang yang jauh '
    'lebih menarik. Sektor ini memiliki pasar yang lebih besar dan lebih dinamis dengan pain point yang '
    'jelas dan mendesak: risiko, kewajiban hukum, dan kekacauan operasional dari panggilan darurat yang '
    'tidak terjawab. Jasa answering service manusia yang menjadi incumbent mengenakan biaya $300-$1.200 '
    'per bulan, namun terkenal lambat, mahal, dan sama sekali tidak memiliki kecerdasan atau otomasi.'
))

story.append(p(
    'Keunggulan strategis niche ini terletak pada celah pasar yang spesifik: tidak ada pemain besar yang '
    'mengkhususkan diri pada penanganan suara darurat pemeliharaan. Perusahaan AI seperti EliseAI '
    'berfokus pada leasing, platform PMS seperti AppFolio terlalu lambat berinovasi, dan jasa answering '
    'service manusia terlalu tidak efisien untuk bertahan. Posisi strategis "after-hours emergency wedge" '
    'memungkinkan produk diluncurkan dengan MVP yang sederhana tanpa memerlukan integrasi PMS yang kompleks, '
    'cukup menggunakan call forwarding biasa. Siklus penjualan yang pendek (1-2 minggu) dan ROI yang '
    'langsung terukur menjadikan niche ini sangat layak untuk eksekusi cepat.'
))

# Market comparison table
market_data = [
    [ph('Aspek'), ph('Manajemen Properti (Emergency Triage)'), ph('Rumah Duka')],
    [pc('Ukuran Pasar'), pc('Besarnya pasar real estate yang terus tumbuh'), pc('~$13.03 Miliar (2024), pertuhanan 5.92% CAGR')],
    [pc('Pain Point'), pc('Risiko, kewajiban hukum, kekacauan operasional'), pc('Menjaga kehormatan dan kepekaan emosional')],
    [pc('Inkumben'), pc('Jasa answering service manusia ($300-$1.200/bulan)'), pc('Proses manual, sistem telepon generik')],
    [pc('Nilai Tambah'), pc('Triage instan, SMS alert, ringkasan tiket, kurangi risiko'), pc('Kurangi panggilan terlewat dengan protokol duka')],
    [pc('Model Harga'), pc('Berlangganan bulanan per properti/portfolio, skalabel'), pc('Biaya per layanan, kurang skalabel')],
    [pc('Siklus Penjualan'), pc('1-2 minggu (transaksional, langsung)'), pc('4-8 minggu (konsultatif, membangun kepercayaan)')],
    [pc('Skalabilitas'), pc('Tinggi: satu agen melayani banyak properti'), pc('Rendah: pertumbuhan linear per klien')],
]
story.extend(make_table(market_data, [0.18, 0.41, 0.41], 'Tabel 11: Perbandingan Pasar - Manajemen Properti vs Rumah Duka'))

story.append(add_heading('10.2 Arsitektur Teknis Voice Agent', 'h2', level=1))

story.append(p(
    'Arsitektur teknis MVP untuk AI Voice Agent dirancang dengan kesederhanaan sebagai prinsip utama. '
    'Pipeline inti terdiri dari tiga komponen: Deepgram untuk transkripsi suara, agen pemrosesan logika '
    '(OpenClaw agent), dan ElevenLabs untuk sintesis suara. MVP bekerja sebagai lapisan di atas sistem '
    'telepon pelanggan yang sudah ada, menggunakan fitur call forwarding standar tanpa memerlukan '
    'integrasi API yang kompleks dengan platform PMS. Ketika panggilan masuk, AI agent mendengarkan, '
    'mengajukan beberapa pertanyaan yang telah ditentukan untuk mengklasifikasikan urgensi, kemudian '
    'memicu alert yang sesuai.'
))

story.append(p(
    'Fungsi inti MVP mencakup lima kapabilitas: (1) Deteksi Darurat melalui keyword spotting untuk '
    'istilah kritis seperti "kebocoran", "kebakaran", "banjir", "pipa pecah", "tidak ada pemanas", dan '
    '"pembobolan"; (2) Klasifikasi Urgensi yang memprogram agen untuk mengajukan pertanyaan klarifikasi '
    'dan mengklasifikasikan tingkat keparahan (KRITIS, URGENT, MONITOR); (3) Peringatan Otomatis yang '
    'mengirim SMS/text alert detail kepada manajer yang bertugas saat masalah beratensi tinggi terdeteksi; '
    '(4) Penanganan Non-Darurat yang mengambil pesan terperinci dan menjadwalkan callback untuk jam kerja; '
    'dan (5) Tanpa Integrasi di mana MVP bekerja dengan nomor telepon standar melalui call forwarding '
    'sederhana, menghilangkan hambatan teknis utama untuk adopsi.'
))

story.append(add_heading('10.3 Model Harga dan Skalabilitas', 'h2', level=1))

story.append(p(
    'Model harga berlangganan bulanan yang diusulkan berkisar $199-$499 per manajer properti, '
    'ditempatkan secara strategis di bawah rata-rata biaya jasa manusia ($300-$1.200/bulan). '
    'Proposisi nilai bersifat ganda: penghematan langsung dengan mengalahkan biaya jasa manusia, dan '
    'penghematan tidak langsung dengan mengurangi risiko kerusakan properti mahal atau kewajiban hukum '
    'akibat panggilan darurat yang tidak terjawab. Model pendapatan sangat skalabel karena satu AI agent '
    'dapat melayani banyak properti di bawah satu kontrak, menghasilkan pendapatan berulang yang '
    'substansial dari satu kesepakatan bergaya enterprise. Harga dapat ditier berdasarkan jumlah properti, '
    'volume panggilan, atau kompleksitas logika triage, mengoptimalkan tangkapan pendapatan lebih lanjut.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 11: KESELAMATAN DAN KETAHANAN
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('11. Fitur Keselamatan dan Ketahanan Sistem'))

story.append(add_heading('11.1 Return-to-Home (RTH)', 'h2', level=1))

story.append(p(
    'Fitur Return-to-Home (RTH) merupakan fitur keselamatan mutlak yang tidak dapat dikompromikan. '
    'Logika RTH harus didasarkan pada beberapa trigger yang independen dan redundan: (1) Kehilangan '
    'Sinyal Remote, di mana sistem memantau kekuatan sinyal dari remote control secara terus-menerus '
    'dan mengaktifkan RTH jika sinyal turun di bawah ambang batas; (2) Baterai Rendah, dengan dua '
    'ambang batas - "peringatan" pada 25% yang memberi tahu pengguna, dan "kritik" pada 15% yang '
    'memicu RTH secara otomatis; dan (3) Kegagalan Sensor, di mana jika sistem mendeteksi kegagalan '
    'kritis pada sensor navigasi seperti hilangnya sinyal GPS atau kegagalan IMU, RTH diaktifkan '
    'sebagai tindakan pencegahan.'
))

story.append(p(
    'Ketika RTH diaktifkan, PicoClaw harus segera mengambil alih kendali melalui proses yang sangat '
    'deterministik: drone menaikkan ketinggian ke level aman (50 meter) untuk menghindari rintangan, '
    'menghitung jalur paling langsung ke titik home, dan terbang ke titik tersebut serta mendarat '
    'secara otomatis. Semua langkah ini dihitung dan dieksekusi oleh PicoClaw tanpa ketergantungan '
    'pada Hermes atau LLM, memastikan respons yang cepat dan andal. Implementasi fitur ini harus berada '
    'di lapisan PicoClaw yang merupakan lapisan kontrol deterministik dan real-time, bukan di lapisan '
    'AI yang latensinya tidak dapat diprediksi.'
))

story.append(add_heading('11.2 Autopilot Failsafe', 'h2', level=1))

story.append(p(
    'Autopilot saat kehilangan kendali remote harus merupakan fungsi lapisan bawah yang tidak dapat '
    'dikompromikan. Jika sinyal dari remote benar-benar terputus, PicoClaw harus segera beralih ke '
    'mode hover stabil, mempertahankan ketinggian dan posisi saat ini dengan menggunakan data dari IMU '
    'dan altimeter. Ini memberikan waktu bagi pengguna untuk memperbaiki koneksi atau memicu RTH secara '
    'manual. Kestabilan hover ini merupakan bukti keandalan lapisan kontrol taktis dan jaminan keamanan '
    'dasar. Sistem umpan balik akustik berupa piezo buzzer pada Arduino juga diprogram untuk menghasilkan '
    'pola nada yang merepresentasikan status operasional wahana, termasuk alarm failsafe berseling cepat '
    'untuk memberikan indikasi audial kepada operator di lapangan.'
))

story.append(add_heading('11.3 Manajemen Daya Darurat', 'h2', level=1))

story.append(p(
    'Sistem manajemen baterai dirancang untuk mengoptimalkan penggunaan energi dari semua sumber yang '
    'tersedia: baterai utama, baterai cadangan, dan panel surya. Sistem memiliki logika cerdas untuk '
    'menentukan kapan harus mengisi baterai, mengalihkan beban ke sumber daya alternatif, dan memasuki '
    'mode hemat daya. Sebagai contoh, ketika baterai utama turun di bawah 20%, sistem secara otomatis '
    'mengaktifkan panel surya untuk mengisi baterai cadangan yang menggerakkan modul komunikasi GSM dan '
    'GPS, memastikan bahwa sistem tetap dapat dikendalikan dan dilacak bahkan jika baterai utama sudah '
    'tidak dapat menggerakkan motor. Implementasi MPPT dengan chip CN3791 memastikan efisiensi transfer '
    'daya hingga 95%, menjadikan panel surya sebagai jaminan kelangsungan hidup yang efektif di lapangan.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 12: PETA JALAN IMPLEMENTASI
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('12. Peta Jalan Implementasi dan Rilis'))

# Boot flow diagram
story.extend(add_image(
    os.path.join(ASSETS_DIR, 'diagram-bootflow.png'),
    width_ratio=0.90,
    caption_text='Gambar 4: Alur Pemuatan Sistem (Boot Flow) Nanggroe OS AI'
))

story.append(p(
    'Peta jalan implementasi Nanggroe OS AI disusun dalam sepuluh fase yang harus diselesaikan secara '
    'sekuensial, di mana setiap fase harus berfungsi secara andal sebelum melanjutkan ke fase berikutnya. '
    'Fase 0 (Definition) mencakup finalisasi visi, modul inti, use case target, dan penamaan. Fase 1 '
    '(Core OS Skeleton) membangun struktur proyek, sistem logging, memori sesi, konfigurasi, plugin '
    'loader, dan dashboard shell. Fase 2 (Hardware Detection) mengimplementasikan deteksi papan, port, '
    'sensor, kapabilitas, dan saran komponen yang kurang. Fase 3 (Mission Engine) mencakup parsing '
    'prompt, generasi misi, breakdown tugas, mesin status misi, dan riwayat misi.'
))

story.append(p(
    'Fase 4 (Telemetry Engine) mengimplementasikan pembacaan status baterai, GPS, sinyal, kesehatan '
    'sensor, dan status misi. Fase 5 (Hermes Assistant) mengaktifkan interaksi bahasa alami, rekomendasi '
    'terstruktur, bantuan troubleshooting, dan ringkasan laporan. Fase 6 (Drone Vertical) mengintegrasikan '
    'autopilot dasar, misi waypoint, return-to-home, pemetaan capture, dan pelepasan payload. Fase 7 '
    '(Android dan Telegram) menghubungkan dashboard Android, jembatan perintah Telegram, notifikasi, '
    'dan pelaporan status jarak jauh. Fase 8 (Voice Interface) mengimplementasikan speech-to-text, '
    'text-to-speech, dan penanganan perintah suara. Fase 9 (Multi-Agent Expansion) memperluas agen '
    'Hermes dan PicoClaw dengan spesialisasi tambahan. Fase 10 (Cross-Domain Expansion) memperluas '
    'dukungan ke rover, marine, agriculture, factory, dan CNC.'
))

# Roadmap table
road_data = [
    [ph('Fase'), ph('Nama'), ph('Deliverable Utama'), ph('Kriteria Sukses')],
    [pc('0', True), pc('Definition'), pc('Visi, modul inti, use case, penamaan final'), pc('Semua stakeholder setuju pada ruang lingkup')],
    [pc('1', True), pc('Core OS Skeleton'), pc('Struktur proyek, logging, memori, config, plugin loader'), pc('Sistem dapat boot dan load konfigurasi')],
    [pc('2', True), pc('Hardware Detection'), pc('Deteksi papan, port, sensor, kapabilitas'), pc('Perangkat terdeteksi dan profil dibuat otomatis')],
    [pc('3', True), pc('Mission Engine'), pc('Parsing prompt, generasi misi, state machine'), pc('Misi dibuat dari perintah bahasa alami')],
    [pc('4', True), pc('Telemetry Engine'), pc('Status baterai, GPS, sinyal, kesehatan sensor'), pc('Data telemetri real-time tersedia di dashboard')],
    [pc('5', True), pc('Hermes Assistant'), pc('Interaksi NL, rekomendasi, troubleshooting'), pc('Hermes merespons perintah dengan rencana valid')],
    [pc('6', True), pc('Drone Vertical'), pc('Autopilot, waypoint, RTH, mapping, payload'), pc('Misi pemetaan otonom berhasil diselesaikan')],
    [pc('7', True), pc('Android dan Telegram'), pc('Dashboard Android, Telegram bridge, notifikasi'), pc('Kontrol jarak jauh berfungsi end-to-end')],
    [pc('8', True), pc('Voice Interface'), pc('STT, TTS, penanganan perintah suara'), pc('Perintah suara diproses dan dieksekusi dengan benar')],
    [pc('9', True), pc('Multi-Agent'), pc('Hermes + PicoClaw dengan spesialisasi'), pc('Kedua agen berkolaborasi dalam skenario kompleks')],
    [pc('10', True), pc('Cross-Domain'), pc('Rover, marine, agriculture, factory, CNC'), pc('Minimal satu domain baru berfungsi penuh')],
]
story.extend(make_table(road_data, [0.06, 0.16, 0.40, 0.38], 'Tabel 12: Peta Jalan Implementasi 10 Fase Nanggroe OS AI'))

# ═══════════════════════════════════════════════════════════════
# SECTION 13: PANDUAN DEPLOYMENT
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('13. Panduan Deployment dan Operasional'))

story.append(add_heading('13.1 Lingkungan Pengembangan Lokal', 'h2', level=1))

story.append(p(
    'Pengembangan lokal Nanggroe OS AI direkomendasikan pada platform Linux sebagai lingkungan utama, '
    'dengan Docker sebagai opsi opsional untuk isolasi lingkungan. SQLite digunakan sebagai pangkalan '
    'data default yang tidak memerlukan konfigurasi server terpisah. Struktur repositorio mengikuti '
    'pola monorepo dengan direktori terpisah untuk backend (Python/FastAPI), frontend (React/Next.js), '
    'firmware (ESP32/Arduino/STM32/Pixhawk), plugins (air/ground/marine/agri/mapping/payload/factory), '
    'serta direktori pendukung untuk telemetry, logs, configs, datasets, simulations, scripts, tools, '
    'docker, dan assets. Konfigurasi lingkungan menggunakan file .env.example sebagai template dengan '
    'variabel yang diperlukan untuk koneksi database, endpoint cloud, dan parameter AI.'
))

story.append(add_heading('13.2 Deployment Perangkat Edge', 'h2', level=1))

story.append(p(
    'Untuk deployment pada perangkat edge, tiga platform direkomendasikan: Raspberry Pi 5 sebagai '
    'komputer pendamping utama drone, Jetson Nano untuk beban kerja AI yang lebih berat, dan Mini PC '
    'untuk stasiun base station. Pada konfigurasi drone companion computer, Raspberry Pi 5 berfungsi '
    'sebagai telemetry bridge, camera processing unit, dan mission sync node. Konfigurasi keamanan '
    'V1 mencakup autentikasi lokal, isolasi sesi, enkripsi rahasia, dan konfigurasi bertanda tangan '
    'opsional. Fitur keamanan lanjutan seperti anti-clone tingkat militer, attestation perangkat keras, '
    'dan kriptografi swarm tidak termasuk dalam V1 untuk memastikan MVP dapat diluncurkan dengan cepat, '
    'namun arsitektur plugin memungkinkan penambahan modul keamanan di masa depan tanpa perubahan kode inti.'
))

story.append(add_heading('13.3 Sinkronisasi Cloud Opsional', 'h2', level=1))

story.append(p(
    'Sinkronisasi ke cloud bukanlah proses yang terus-menerus, melainkan diaktifkan secara eksplisit '
    'atau terjadi secara periodik saat koneksi tersedia. Pendekatan yang paling efisien adalah delta '
    'synchronization, di mana hanya perubahan (delta) yang dikirimkan ke server, bukan seluruh database. '
    'Sebagai contoh, jika sebuah misi menghasilkan 1000 foto, sistem mengunggah metadata misi dan daftar '
    'hash dari file foto, bukan seluruh file. Server kemudian memeriksa hash dan hanya meminta file yang '
    'belum dimilikinya, secara dramatis mengurangi volume data yang harus dikirimkan. Lapisan penyimpanan '
    'dipisahkan dari lapisan aplikasi, di mana modul penyimpanan bertanggung jawab untuk semua operasi '
    'I/O ke disk dan manajemen cache, sementara modul lain berkomunikasi melalui API yang terdefinisi '
    'dengan baik. Pendekatan ini memungkinkan pengoptimalan modul penyimpanan secara independen, termasuk '
    'penerapan kompresi data atau enkripsi end-to-end untuk keamanan data.'
))

# ═══════════════════════════════════════════════════════════════
# SECTION 14: PENGUJIAN DAN QA
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('14. Spesifikasi Pengujian dan Jaminan Kualitas'))

story.append(add_heading('14.1 Tingkat Pengujian', 'h2', level=1))

story.append(p(
    'Strategi pengujian Nanggroe OS AI terdiri dari empat tingkat yang saling melengkungi. Tingkat '
    'pertama adalah Unit Tests yang mencakup parsing perangkat, parsing misi, dan pemuatan konfigurasi. '
    'Setiap modul inti harus memiliki cakupan pengujian unit minimal 80% untuk memastikan kebenaran '
    'logika dasar. Tingkat kedua adalah Integration Tests yang memvalidasi interaksi antar-komponen '
    'utama: dashboard ke backend, Telegram ke mission engine, dan telemetry ke memory. Pengujian '
    'integrasi memastikan bahwa data mengalir dengan benar melalui seluruh tumpukan sistem dan bahwa '
    'kontrak antarmuka antar-modul dipatuhi.'
))

story.append(p(
    'Tingkat ketiga adalah Hardware-in-the-Loop (HIL) Tests yang melibatkan perangkat keras fisik: '
    'satu papan terhubung, satu sensor terhubung, dan satu aktuator terhubung. Pengujian HIL memvalidasi '
    'bahwa lapisan abstraksi perangkat keras berfungsi dengan benar dengan perangkat nyata dan bahwa '
    'deteksi otomatis menghasilkan profil yang akurat. Tingkat keempat adalah System Tests yang mencakup '
    'alur lengkap dari prompt ke misi, operasi offline, dan pemulihan sinkronisasi. Kriteria keluaran '
    'untuk semua tingkat pengujian mencakup: tidak ada crash kritis, output yang dapat diprediksi, log '
    'yang tersimpan, dan pemulihan yang berhasil setelah restart.'
))

# Test plan table
test_data = [
    [ph('Tingkat'), ph('Cakupan'), ph('Contoh Pengujian'), ph('Kriteria Keluaran')],
    [pc('Unit Tests'), pc('Modul individual'), pc('Parsing perangkat, parsing misi, config loading'), pc('Minimal 80% code coverage, semua test pass')],
    [pc('Integration Tests'), pc('Interaksi antar-modul'), pc('Dashboard ke backend, Telegram ke mission engine'), pc('Data flow benar, kontrak antarmuka dipatuhi')],
    [pc('HIL Tests'), pc('Perangkat keras fisik'), pc('Satu board + satu sensor + satu aktuator terhubung'), pc('Deteksi otomatis akurat, HAL berfungsi benar')],
    [pc('System Tests'), pc('Alur end-to-end'), pc('Prompt ke misi, operasi offline, pemulihan sync'), pc('Tidak ada crash, output prediktabel, log tersimpan')],
]
story.extend(make_table(test_data, [0.14, 0.18, 0.36, 0.32], 'Tabel 13: Tingkat Pengujian Nanggroe OS AI'))

story.append(add_heading('14.2 Rencana Rilis Bertahap', 'h2', level=1))

story.append(p(
    'Rencana rilis mengikuti pendekatan iteratif dengan empat tahap utama. Release 0.1 mencakup '
    'struktur inti, logging, konfigurasi, dan dashboard shell sebagai fondasi sistem. Release 0.2 '
    'menambahkan deteksi perangkat keras, telemetri, dan model misi sebagai kemampuan operasional dasar. '
    'Release 0.3 mengintegrasikan agen Hermes, jembatan Telegram, dan umpan balik suara untuk '
    'memungkinkan interaksi pengguna yang kaya. Release 0.4 melengkapi sistem dengan plugin perangkat '
    'pertama, alur kerja pemetaan pertama, dan loop otonom pertama yang merupakan pencapaian milestone '
    'kritis. Prinsip rilis yang ketat diterapkan: sistem hanya dikirimkan ketika sudah cukup stabil '
    'untuk digunakan kembali, memastikan setiap rilis memberikan nilai nyata kepada pengguna.'
))

# Release table
rel_data = [
    [ph('Release'), ph('Fitur Utama'), ph('Milestone')],
    [pc('0.1'), pc('Struktur inti, logging, konfigurasi, dashboard shell'), pc('Sistem dapat boot dan diakses via browser')],
    [pc('0.2'), pc('Deteksi hardware, telemetri, model misi'), pc('Perangkat terdeteksi, telemetri real-time tersedia')],
    [pc('0.3'), pc('Agen Hermes, Telegram bridge, voice feedback'), pc('Perintah bahasa alami diproses dan dieksekusi')],
    [pc('0.4'), pc('Plugin perangkat pertama, mapping workflow, loop otonom'), pc('Misi pemetaan otonom berhasil dilaksanakan end-to-end')],
]
story.extend(make_table(rel_data, [0.10, 0.50, 0.40], 'Tabel 14: Rencana Rilis Bertahap Nanggroe OS AI'))

# ═══════════════════════════════════════════════════════════════
# SECTION 15: API DAN KONTRAK ANTARMUKA
# ═══════════════════════════════════════════════════════════════
story.extend(add_major_section('15. API Inti dan Kontrak Antarmuka'))

story.append(p(
    'Seluruh operasi API inti Nanggroe OS AI mengikuti gaya JSON request/response dengan kode status '
    'deterministik, pesan error eksplisit, dan tidak ada perubahan state tersembunyi. API utama mencakup '
    'delapan operasi fundamental yang menjadi tulang punggung interaksi antar-lapisan sistem. Operasi '
    'detect_device() memulai pemindaian perangkat keras fisik dan mengembalikan profil kapabilitas '
    'melalui protokol USB/I2C/Serial. Operasi build_mission(prompt) menerjemahkan instruksi teks alami '
    'menjadi urutan waypoint pemetaan melalui LLM lokal dan parser. Operasi start_mission(id) '
    'mengirimkan perintah arming dan mengeksekusi misi otonom melalui protokol MAVLink.'
))

# API table
api_data = [
    [ph('Operasi API'), ph('Deskripsi'), ph('Protokol')],
    [pc('detect_device()'), pc('Pemindaian perangkat keras, mengembalikan profil kapabilitas'), pc('USB / I2C / Serial')],
    [pc('build_mission(prompt)'), pc('Terjemahan instruksi teks alami menjadi waypoint pemetaan'), pc('LLM Local / Parser')],
    [pc('start_mission(id)'), pc('Arming motor dan eksekusi misi otonom'), pc('MAVLink')],
    [pc('stop_mission(id)'), pc('Hentikan drone di udara, masuk mode hover'), pc('MAVLink')],
    [pc('return_home(id)'), pc('Perintahkan drone kembali ke titik peluncuran awal'), pc('MAVLink')],
    [pc('sync_memory()'), pc('Kirim log perubahan lokal ke server PostgreSQL'), pc('HTTPS / CloudSync')],
    [pc('calibrate(id, profile)'), pc('Kalibrasi sensor kompas atau akselerometer'), pc('MAVLink Command / I2C')],
    [pc('save_log(entry)'), pc('Tambahkan entri log ke sesi saat ini'), pc('Internal / SQLite')],
    [pc('get_telemetry(id)'), pc('Ambil snapshot telemetri terbaru'), pc('Internal / WebSocket')],
]
story.extend(make_table(api_data, [0.22, 0.48, 0.30], 'Tabel 15: Operasi API Inti Nanggroe OS AI'))

story.append(p(
    'Kontrak adapter yang diwajibkan bagi setiap plugin perangkat keras diimplementasikan melalui tujuh '
    'metode standar: initialize() untuk mempersiapkan parameter memori dan mendaftarkan plugin, detect() '
    'untuk pembacaan handshake fisik, arm() untuk sinyal otorisasi keselamatan pra-penyalaan, execute() '
    'untuk memulai eksekusi rute waypoint, pause() untuk menangguhkan sementara, stop() untuk mematikan '
    'secara aman, dan report_status() untuk mengirimkan data telemetri dan pembacaan sensor ke dasbor. '
    'Setiap adapter harus mematuhi kontrak ini untuk menjamin modularitas sistem dan kemampuan '
    'penggantian komponen tanpa modifikasi kode inti.'
))

# ── Build the PDF ──
doc.multiBuild(story)
print(f"Body PDF generated: {BODY_PDF}")
