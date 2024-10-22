document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfo = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const conversionProgress = document.getElementById('conversion-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

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
                } catch (error) {
                    console.error('Error parsing video info:', error);
                    showError('Error parsing video information. Please try again.');
                }
            } else {
                console.error('Error fetching video information:', xhr.status, xhr.statusText);
                showError('Error fetching video information. Please check the URL and try again.');
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

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/convert', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Conversion successful:', response);
                    if (response.filename) {
                        downloadFile(response.filename);
                    } else {
                        throw new Error('Invalid conversion response');
                    }
                } catch (error) {
                    console.error('Error parsing conversion response:', error);
                    showError('Error during conversion. Please try again.');
                }
            } else {
                console.error('Error converting video:', xhr.responseText);
                showError('Error converting video. Please try again later.');
            }
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            conversionProgress.classList.add('d-none');
        };
        xhr.onerror = function() {
            console.error('Network error during conversion');
            showError('Network error during conversion. Please check your internet connection and try again.');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            conversionProgress.classList.add('d-none');
        };
        xhr.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                updateProgress(percentComplete);
            }
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
        console.log('Downloading file:', filename);
        window.location.href = '/download/' + encodeURIComponent(filename);
    }

    function showError(message) {
        alert(message);
        // TODO: Implement a more user-friendly error display method
        // For example, updating a dedicated error message element on the page
    }
});
