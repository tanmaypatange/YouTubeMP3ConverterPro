import os
import urllib.parse
import logging
import re
from flask import Flask, render_template, request, jsonify, send_file, Response
from googleapiclient.discovery import build
import yt_dlp

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
    try:
        video_id = urllib.parse.urlparse(video_url).query.split('v=')[1]
    except IndexError:
        logger.error(f"Invalid YouTube URL: {video_url}")
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    try:
        logger.info(f"Fetching video info for ID: {video_id}")
        video_response = youtube.videos().list(
            part='snippet',
            id=video_id
        ).execute()

        if not video_response['items']:
            logger.error(f"No video found for ID: {video_id}")
            return jsonify({'error': 'Video not found'}), 404

        video_info = video_response['items'][0]['snippet']
        
        return jsonify({
            'title': video_info['title'],
            'thumbnail': video_info['thumbnails']['medium']['url']
        })
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        return jsonify({'error': 'Error fetching video information'}), 500

@app.route('/convert', methods=['POST'])
def convert():
    video_url = request.form['video_url']
    
    try:
        logger.info(f"Starting conversion for URL: {video_url}")

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent = d['_percent_str']
                yield f"data: {percent}\n\n"
            elif d['status'] == 'finished':
                yield "data: 100%\n\n"

        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': 'downloads/%(title)s.%(ext)s',
            'progress_hooks': [progress_hook],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            title = info['title']
            safe_title = re.sub(r'[^\w\-_\. ]', '', title)
            safe_title = safe_title.replace(' ', '_')
            filename = f"{safe_title}.mp3"
            ydl.download([video_url])

        return Response(progress_hook({}), mimetype='text/event-stream')

    except Exception as e:
        logger.error(f"Error during conversion: {str(e)}")
        return jsonify({'error': 'Error during conversion'}), 500

@app.route('/download/<filename>')
def download(filename):
    logger.info(f"Downloading file: {filename}")
    return send_file(f'downloads/{filename}', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
