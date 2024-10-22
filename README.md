# YouTube to MP3 Converter

This project is a web application that allows users to convert YouTube videos to MP3 format easily and quickly. Built with Flask and vanilla JavaScript, it provides a simple and intuitive interface for users to input YouTube URLs, fetch video information, and download the audio in MP3 format.

## Features

- Simple and intuitive user interface
- Fetch video information (title and thumbnail) from YouTube URLs
- Convert YouTube videos to MP3 format
- Download converted MP3 files directly from the browser
- Real-time conversion status updates
- Error handling and user feedback

## Technologies Used

- Backend: Python with Flask
- Frontend: HTML, CSS (Bootstrap), and vanilla JavaScript
- YouTube Data API for fetching video information
- yt-dlp for video downloading and conversion

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/youtube-to-mp3-converter.git
   cd youtube-to-mp3-converter
   ```

2. Install the required Python packages:
   ```
   pip install flask google-api-python-client yt-dlp
   ```

3. Set up your YouTube API key:
   - Go to the [Google Developers Console](https://console.developers.google.com/)
   - Create a new project and enable the YouTube Data API v3
   - Create credentials (API Key)
   - Set the API key as an environment variable:
     ```
     export YOUTUBE_API_KEY=your_api_key_here
     ```

## Usage

1. Start the Flask server:
   ```
   python main.py
   ```

2. Open a web browser and navigate to `http://localhost:5000`

3. Enter a YouTube URL in the input field and click "Fetch Info"

4. Once the video information is displayed, click "Convert & Download MP3"

5. Wait for the conversion process to complete, and the MP3 file will automatically download

## Project Structure

- `main.py`: Entry point of the application
- `app.py`: Flask application with route handlers
- `templates/index.html`: HTML template for the main page
- `static/css/custom.css`: Custom CSS styles
- `static/js/script.js`: JavaScript for handling user interactions and AJAX requests

## Error Handling

The application includes error handling for various scenarios:
- Invalid YouTube URLs
- Network errors
- API errors
- Conversion failures

Error messages are displayed to the user in a friendly manner.

## Limitations

- The application is designed for personal use and may not be suitable for high-volume conversions
- YouTube's terms of service should be respected when using this tool
- Some videos may not be available for conversion due to copyright restrictions

## Future Improvements

- Add support for playlist conversions
- Implement user accounts for saving conversion history
- Optimize conversion process for faster results
- Add more output format options (e.g., AAC, WAV)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This tool is for educational purposes only. Please respect copyright laws and YouTube's terms of service when using this application.

## Troubleshooting

### YouTube API Key Issues

If you encounter errors related to the YouTube API key, such as "API Key not found" or "Invalid API key," follow these steps:

1. Ensure that you have set the `YOUTUBE_API_KEY` environment variable correctly:
   ```
   export YOUTUBE_API_KEY=your_actual_api_key_here
   ```

2. Verify that your API key is valid and has the necessary permissions:
   - Go to the [Google Developers Console](https://console.developers.google.com/)
   - Select your project
   - Navigate to "Credentials"
   - Check that your API key is listed and enabled

3. Make sure the YouTube Data API v3 is enabled for your project:
   - In the Google Developers Console, go to "Library"
   - Search for "YouTube Data API v3"
   - Click on it and ensure it's enabled for your project

4. If you're using Replit, make sure to add the `YOUTUBE_API_KEY` to your project's secrets:
   - Go to the "Secrets" tab in your Replit project
   - Add a new secret with the key `YOUTUBE_API_KEY` and your API key as the value

5. Restart your Flask application after making any changes to environment variables or secrets.

If you continue to experience issues, double-check your API key and ensure you haven't exceeded your quota limits for the YouTube Data API.
