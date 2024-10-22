import os
import urllib.parse
import logging
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
            part='snippet',
            id=video_id
        ).execute()

        video_info = video_response['items'][0]['snippet']
        return jsonify({
            'title': video_info['title'],
            'thumbnail': video_info['thumbnails']['medium']['url']
        })
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/convert', methods=['POST'])
def convert():
    video_url = request.form['video_url']
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'logger': logger,
        'progress_hooks': [logging_hook],
    }

    try:
        logger.info(f"Starting conversion for URL: {video_url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info)
            mp3_filename = os.path.splitext(filename)[0] + '.mp3'
        
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
