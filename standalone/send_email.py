#!/usr/bin/env python3
"""Send RapClouds gallery email via Gmail SMTP."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
import sys
sys.path.insert(0, str(Path.home() / ".hermes/skills/gmail/scripts"))
from fetch_email import load_env

env = load_env(Path.home() / ".hermes/skills/gmail")
user = env.get('GMAIL_USER')
password = env.get('GMAIL_APP_PASSWORD')

if not user or not password:
    print('ERROR: No credentials found')
    sys.exit(1)

print(f'Using account: {user}')

msg = MIMEMultipart('alternative')
msg['Subject'] = 'RapClouds - J. Cole The Fall-Off Word Clouds'
msg['From'] = user
msg['To'] = user

html_body = """<html>
<body style="font-family: -apple-system, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #e6edf3;">
  <h1 style="color: #FF1493; font-size: 28px;">RapClouds - The Fall-Off</h1>
  <p style="color: #8b949e; font-size: 14px;">J. Cole | 24 word clouds | Generated from lyrics</p>
  
  <div style="background: #141414; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin: 20px 0;">
    <h2 style="color: #FF1493; margin-top: 0;">View Gallery</h2>
    <a href="https://portfolio.jordanchristley.com/semi/rapclouds/index.html" style="color: #00E5FF; font-size: 18px; text-decoration: none;">
      portfolio.jordanchristley.com/semi/rapclouds
    </a>
    <p style="color: #8b949e; margin-top: 12px;">Click any image to view full-size. All 24 tracks from The Fall-Off.</p>
  </div>

  <div style="background: #141414; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin: 20px 0;">
    <h2 style="color: #FFD700; margin-top: 0;">Tracks Included</h2>
    <div style="columns: 2; column-gap: 20px; font-size: 13px; color: #8b949e;">
      <p>29 Intro</p><p>Two Six</p><p>SAFETY</p><p>Run A Train</p>
      <p>Poor Thang</p><p>Legacy</p><p>Bunce Road Blues</p><p>WHO TF IZ U</p>
      <p>Drum n Bass</p><p>The Let Out</p><p>Bombs in the Ville</p><p>Lonely at the Top</p>
      <p>39 Intro</p><p>The Fall-Off Is Inevitable</p><p>The Villest</p><p>Old Dog</p>
      <p>Life Sentence</p><p>Only You</p><p>Man Up Above</p><p>I Love Her Again</p>
      <p>What If</p><p>Quik Stop</p><p>and the whole world is the Ville</p><p>Ocean Way</p>
    </div>
  </div>

  <div style="background: #141414; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin: 20px 0;">
    <h2 style="color: #00E676; margin-top: 0;">How It Works</h2>
    <ul style="color: #8b949e; font-size: 13px;">
      <li>Lyrics scraped from SongLyrics.com (17,000+ words total)</li>
      <li>Word clouds shaped using J. Cole silhouette mask</li>
      <li>Python wordcloud library with RapClouds settings</li>
      <li>Each cloud shows the most frequent words from that track</li>
    </ul>
  </div>

  <p style="color: #8b949e; font-size: 12px; text-align: center; margin-top: 30px;">
    Generated with RapClouds Standalone - Made for The Fall-Off concert
  </p>
</body>
</html>"""

text_body = """RapClouds - J. Cole The Fall-Off

View the gallery: https://portfolio.jordanchristley.com/semi/rapclouds/index.html

24 word clouds generated from The Fall-Off lyrics.
Each cloud is shaped using a J. Cole silhouette mask.
"""

msg.attach(MIMEText(text_body, 'plain'))
msg.attach(MIMEText(html_body, 'html'))

try:
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(user, password)
    server.sendmail(user, user, msg.as_string())
    server.quit()
    print('Email sent successfully!')
except Exception as e:
    print(f'Failed to send: {e}')
    sys.exit(1)
