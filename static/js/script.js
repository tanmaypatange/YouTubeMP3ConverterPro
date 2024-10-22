document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfo = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const bitrateSelect = document.getElementById('bitrate');
    const fileSizeInfo = document.getElementById('file-size');
    const downloadBtn = document.getElementById('download-btn');
    const conversionProgress = document.getElementById('conversion-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    fetchInfoBtn.addEventListener('click', fetchVideoInfo);
    downloadBtn.addEventListener('click', convertAndDownload);
    bitrateSelect.addEventListener('change', updateFileSize);

    let fileSizes = {};

    function fetchVideoInfo() {
        const videoUrl = videoUrlInput.value;
        if (!videoUrl) return;

        console.log('Fetching video info for:', videoUrl);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/get_video_info', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                console.log('Video info received:', response);
                videoThumbnail.src = response.thumbnail;
                videoTitle.textContent = response.title;
                fileSizes = response.file_sizes;
                updateFileSize();
                videoInfo.classList.remove('d-none');
                downloadBtn.disabled = false;
            } else {
                console.error('Error fetching video information:', xhr.responseText);
                alert('Error fetching video information');
            }
        };
        xhr.onerror = function() {
            console.error('Network error while fetching video information');
            alert('Network error while fetching video information');
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function updateFileSize() {
        const selectedBitrate = bitrateSelect.value;
        fileSizeInfo.textContent = `Estimated file size: ${fileSizes[selectedBitrate]}`;
    }

    function convertAndDownload() {
        const videoUrl = videoUrlInput.value;
        const bitrate = bitrateSelect.value;
        if (!videoUrl) return;

        console.log('Starting conversion for:', videoUrl);
        downloadBtn.disabled = true;
        conversionProgress.classList.remove('d-none');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/convert', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                console.log('Conversion successful:', response);
                downloadFile(response.filename);
                downloadBtn.disabled = false;
                conversionProgress.classList.add('d-none');
            } else {
                console.error('Error converting video:', xhr.responseText);
                alert('Error converting video: ' + xhr.responseText);
                downloadBtn.disabled = false;
                conversionProgress.classList.add('d-none');
            }
        };
        xhr.onerror = function() {
            console.error('Network error during conversion');
            alert('Network error during conversion');
            downloadBtn.disabled = false;
            conversionProgress.classList.add('d-none');
        };
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                console.log('Conversion progress:', percentComplete.toFixed(2) + '%');
                progressBar.style.width = percentComplete + '%';
                progressBar.setAttribute('aria-valuenow', percentComplete);
                progressBar.textContent = percentComplete.toFixed(0) + '%';
                progressText.textContent = `Converting... ${percentComplete.toFixed(0)}%`;
            }
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl) + '&bitrate=' + encodeURIComponent(bitrate));
    }

    function downloadFile(filename) {
        console.log('Downloading file:', filename);
        window.location.href = '/download/' + encodeURIComponent(filename);
    }
});
