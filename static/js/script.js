document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfo = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const conversionStatus = document.getElementById('conversion-status');
    const statusText = document.getElementById('status-text');
    const errorMessage = document.getElementById('error-message');

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', convertAndDownload);
    } else {
        console.error('Download button not found in the DOM');
    }

    fetchInfoBtn.addEventListener('click', fetchVideoInfo);

    function fetchVideoInfo() {
        const videoUrl = videoUrlInput.value;
        if (!videoUrl) {
            showError('Please enter a valid YouTube URL');
            return;
        }

        console.log('Fetching video info for:', videoUrl);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/get_video_info', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Raw response:', xhr.responseText);
                    console.log('Parsed response:', response);

                    if (!response.title || !response.thumbnail) {
                        throw new Error('Incomplete video information received');
                    }
                    videoThumbnail.src = response.thumbnail;
                    videoTitle.textContent = response.title;
                    videoInfo.classList.remove('d-none');
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                    hideError();
                } catch (error) {
                    console.error('Error parsing video info:', error);
                    showError('Error parsing video information. Please try again.');
                }
            } else {
                console.error('Error fetching video information:', xhr.status, xhr.statusText);
                showError(JSON.parse(xhr.responseText).error || 'Error fetching video information. Please check the URL and try again.');
            }
        };
        xhr.onerror = function() {
            console.error('Network error while fetching video information');
            showError('Network error while fetching video information. Please check your internet connection and try again.');
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function convertAndDownload() {
        const videoUrl = videoUrlInput.value;
        if (!videoUrl) {
            showError('Please enter a valid YouTube URL');
            return;
        }

        console.log('Starting conversion for:', videoUrl);
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }
        conversionStatus.classList.remove('d-none');
        hideError();

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/convert', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.responseType = 'text';
        xhr.onprogress = function() {
            const lines = xhr.responseText.split('\n\n');
            const lastLine = lines[lines.length - 2];
            if (lastLine && lastLine.startsWith('data: ')) {
                const data = JSON.parse(lastLine.substring(6));
                console.log('Received data:', data);
                if (data.status === 'downloading') {
                    updateConversionStatus('Your file is being processed. This usually takes a few seconds...');
                } else if (data.status === 'completed') {
                    console.log('Conversion completed, filename:', data.filename);
                    updateConversionStatus('Conversion complete! Your file will start downloading shortly.');
                    downloadFile(data.filename);
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                } else if (data.error) {
                    console.error('Conversion error:', data.error);
                    showError(data.error);
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                    conversionStatus.classList.add('d-none');
                }
            }
        };
        xhr.onerror = function() {
            console.error('Network error during conversion');
            showError('Network error during conversion. Please check your internet connection and try again.');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            conversionStatus.classList.add('d-none');
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function updateConversionStatus(status) {
        statusText.textContent = status;
    }

    function downloadFile(filename) {
        console.log('Attempting to download file:', filename);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = '/download/' + encodeURIComponent(filename);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('File download initiated');
    }

    function showError(message) {
        console.error('Error:', message);
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }

    function hideError() {
        errorMessage.textContent = '';
        errorMessage.classList.add('d-none');
    }
});
