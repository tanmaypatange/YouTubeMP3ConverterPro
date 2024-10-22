import os
import urllib.parse
from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
from googleapiclient.discovery import build

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# YouTube API key (replace with your actual API key)
YOUTUBE_API_KEY = "YOUR_YOUTUBE_API_KEY"
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_video_info', methods=['POST'])
def get_video_info():
    video_url = request.form['video_url']
    video_id = urllib.parse.urlparse(video_url).query.split('v=')[1]
    
    try:
        video_response = youtube.videos().list(
            part='snippet',
            id=video_id
        ).execute()

        video_info = video_response['items'][0]['snippet']
        return jsonify({
            'title': video_info['title'],
            'description': video_info['description'],
            'thumbnail': video_info['thumbnails']['medium']['url']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/convert', methods=['POST'])
def convert():
    video_url = request.form['video_url']
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': 'downloads/%(title)s.%(ext)s',
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        filename = ydl.prepare_filename(info)
        mp3_filename = os.path.splitext(filename)[0] + '.mp3'
    
    return jsonify({
        'filename': os.path.basename(mp3_filename),
        'filesize': os.path.getsize(mp3_filename)
    })

@app.route('/download/<filename>')
def download(filename):
    return send_file(f'downloads/{filename}', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
