import os
import urllib.parse
import logging
import re
from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
from googleapiclient.discovery import build
import ffmpeg

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# YouTube API key from environment variable
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_video_info', methods=['POST'])
def get_video_info():
    video_url = request.form['video_url']
    video_id = urllib.parse.urlparse(video_url).query.split('v=')[1]
    
    try:
        logger.info(f"Fetching video info for ID: {video_id}")
        video_response = youtube.videos().list(
            part='snippet,contentDetails',
            id=video_id
        ).execute()

        video_info = video_response['items'][0]['snippet']
        duration = video_response['items'][0]['contentDetails']['duration']
        
        # Estimate file sizes for different bitrates
        duration_seconds = parse_duration(duration)
        file_sizes = {
            '128': estimate_file_size(duration_seconds, 128),
            '192': estimate_file_size(duration_seconds, 192),
            '320': estimate_file_size(duration_seconds, 320)
        }
        
        return jsonify({
            'title': video_info['title'],
            'thumbnail': video_info['thumbnails']['medium']['url'],
            'file_sizes': file_sizes
        })
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/convert', methods=['POST'])
def convert():
    video_url = request.form['video_url']
    bitrate = request.form['bitrate']
    
    try:
        logger.info(f"Starting conversion for URL: {video_url}")
        with yt_dlp.YoutubeDL({'format': 'bestaudio/best'}) as ydl:
            info = ydl.extract_info(video_url, download=False)
            title = info['title']
            
        # Remove special characters and spaces from the title
        safe_title = re.sub(r'[^\w\-_\. ]', '', title)
        safe_title = safe_title.replace(' ', '_')
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': f'downloads/{safe_title}.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': bitrate,
            }],
            'logger': logger,
            'progress_hooks': [logging_hook],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        
        mp3_filename = f'downloads/{safe_title}.mp3'
        logger.info(f"Conversion successful. File: {mp3_filename}")
        return jsonify({
            'filename': os.path.basename(mp3_filename),
            'filesize': os.path.getsize(mp3_filename)
        })
    except Exception as e:
        logger.error(f"Error during conversion: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download(filename):
    logger.info(f"Downloading file: {filename}")
    return send_file(f'downloads/{filename}', as_attachment=True)

def logging_hook(d):
    if d['status'] == 'downloading':
        logger.info(f"Downloading: {d['filename']} - {d['_percent_str']} of {d['_total_bytes_str']}")
    elif d['status'] == 'finished':
        logger.info(f"Download finished: {d['filename']}")

def parse_duration(duration):
    match = re.match(r'PT(\d+H)?(\d+M)?(\d+S)?', duration)
    hours = int(match.group(1)[:-1]) if match.group(1) else 0
    minutes = int(match.group(2)[:-1]) if match.group(2) else 0
    seconds = int(match.group(3)[:-1]) if match.group(3) else 0
    return hours * 3600 + minutes * 60 + seconds

def estimate_file_size(duration, bitrate):
    size_bytes = (duration * bitrate * 1000) / 8
    return f"{size_bytes / (1024 * 1024):.2f} MB"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
