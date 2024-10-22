document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfo = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const conversionProgress = document.getElementById('conversion-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
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
        conversionProgress.classList.remove('d-none');
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
                if (data.progress) {
                    updateProgress(parseFloat(data.progress));
                }
                if (data.status === 'completed') {
                    console.log('Conversion completed');
                    downloadFile(data.filename);
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                }
                if (data.error) {
                    console.error('Conversion error:', data.error);
                    showError(data.error);
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                    conversionProgress.classList.add('d-none');
                }
            }
        };
        xhr.onerror = function() {
            console.error('Network error during conversion');
            showError('Network error during conversion. Please check your internet connection and try again.');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            conversionProgress.classList.add('d-none');
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function updateProgress(percent) {
        console.log('Conversion progress:', percent.toFixed(2) + '%');
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('aria-valuenow', percent);
        progressBar.textContent = percent.toFixed(0) + '%';
        progressText.textContent = `Converting... ${percent.toFixed(0)}%`;
    }

    function downloadFile(filename) {
        console.log('Attempting to download file:', filename);
        fetch('/download/' + encodeURIComponent(filename))
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Unknown error occurred');
                    });
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                console.log('File download initiated successfully');
            })
            .catch(error => {
                console.error('Error downloading file:', error.message);
                showError('Error downloading file: ' + error.message);
            });
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
