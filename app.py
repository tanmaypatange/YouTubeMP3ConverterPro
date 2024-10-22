import os
import urllib.parse
import logging
import re
import json
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

@app.route('/convert', methods=['GET'])
def convert():
    video_url = request.args.get('video_url')
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
                if info is None:
                    logger.error(f"Failed to extract video information for URL: {video_url}")
                    yield f"data: {json.dumps({'error': 'Failed to extract video information'})}\n\n"
                    return
                title = info['title']
                safe_title = re.sub(r'[^\w\-_\. ]', '', title)
                safe_title = safe_title.replace(' ', '_')
                filename = f"{safe_title}.mp3"
                logger.info(f"Starting download for video: {title}")
                ydl.download([video_url])

            logger.info(f"Conversion completed for video: {title}")
            yield f"data: {json.dumps({'filename': filename, 'status': 'completed'})}\n\n"

        except Exception as e:
            logger.error(f"Error during conversion: {str(e)}")
            yield f"data: {json.dumps({'error': 'Error during conversion. Please try again later.'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/download/<filename>')
def download(filename):
    logger.info(f"Downloading file: {filename}")
    return send_file(f'downloads/{filename}', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
