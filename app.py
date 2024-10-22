import os
import urllib.parse
import logging
import re
import json
import time
import glob
import uuid
from flask import Flask, render_template, request, jsonify, send_file, Response, stream_with_context
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

# Create a persistent download directory
DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_video_info', methods=['POST'])
def get_video_info():
    video_url = request.form.get('video_url')
    if not video_url:
        return jsonify({'error': 'Missing video URL'}), 400
    
    try:
        video_id = urllib.parse.parse_qs(urllib.parse.urlparse(video_url).query)['v'][0]
    except (KeyError, IndexError):
        logger.error(f"Invalid YouTube URL: {video_url}")
        return jsonify({'error': 'Invalid YouTube URL. Please provide a valid YouTube video URL.'}), 400
    
    try:
        logger.info(f"Fetching video info for ID: {video_id}")
        video_response = youtube.videos().list(
            part='snippet',
            id=video_id
        ).execute()

        if not video_response['items']:
            logger.error(f"No video found for ID: {video_id}")
            return jsonify({'error': 'Video not found. Please check the URL and try again.'}), 404

        video_info = video_response['items'][0]['snippet']
        
        return jsonify({
            'title': video_info['title'],
            'thumbnail': video_info['thumbnails']['medium']['url']
        })
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        return jsonify({'error': 'Error fetching video information. Please try again later.'}), 500

@app.route('/convert', methods=['POST'])
def convert():
    video_url = request.form.get('video_url')
    if not video_url:
        return jsonify({'error': 'Missing video URL'}), 400
    
    def generate():
        try:
            logger.info(f"Starting conversion for URL: {video_url}")

            def progress_hook(d):
                if d['status'] == 'downloading':
                    percent = d.get('_percent_str', 'N/A').replace('%', '')
                    yield f"data: {json.dumps({'progress': percent, 'status': 'downloading'})}\n\n"
                elif d['status'] == 'finished':
                    yield f"data: {json.dumps({'progress': '100', 'status': 'finished'})}\n\n"

            with yt_dlp.YoutubeDL() as ydl:
                info = ydl.extract_info(video_url, download=False)
                if info is None:
                    logger.error(f"Failed to extract video information for URL: {video_url}")
                    yield f"data: {json.dumps({'error': 'Failed to extract video information'})}\n\n"
                    return
                
                unique_id = str(uuid.uuid4())
                safe_title = re.sub(r'[^\w\-_\.]', '_', info['title'])
                filename = f"{safe_title[:30]}_{unique_id}.mp3"
                
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '128',
                    }],
                    'outtmpl': os.path.join(DOWNLOAD_DIR, filename),
                    'progress_hooks': [progress_hook],
                }

            start_time = time.time()
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Starting download for video: {info['title']}")
                ydl.download([video_url])

            file_path = os.path.join(DOWNLOAD_DIR, filename)
            logger.info(f"Conversion completed. Checking file: {file_path}")
            logger.info(f"File exists: {os.path.exists(file_path)}")
            if os.path.exists(file_path):
                logger.info(f"File size: {os.path.getsize(file_path)} bytes")
                yield f"data: {json.dumps({'filename': filename, 'status': 'completed'})}\n\n"
            else:
                logger.error(f"File not found after conversion: {file_path}")
                # List all files in the download directory
                logger.info(f"Files in download directory: {os.listdir(DOWNLOAD_DIR)}")
                yield f"data: {json.dumps({'error': 'File not found after conversion'})}\n\n"

        except Exception as e:
            logger.error(f"Error during conversion: {str(e)}")
            yield f"data: {json.dumps({'error': 'Error during conversion. Please try again later.'})}\n\n"
        finally:
            end_time = time.time()
            logger.info(f"Conversion process took {end_time - start_time:.2f} seconds")

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/download/<path:filename>')
def download(filename):
    logger.info(f"Download requested for file: {filename}")
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    logger.info(f"Full file path: {file_path}")
    logger.info(f"File exists: {os.path.exists(file_path)}")
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        # List all files in the download directory
        logger.info(f"Files in download directory: {os.listdir(DOWNLOAD_DIR)}")
        return jsonify({'error': f'File not found: {filename}. Please try converting again.'}), 404
    try:
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        logger.error(f"Error sending file: {str(e)}")
        return jsonify({'error': f'Error sending file: {str(e)}. Please try again.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
