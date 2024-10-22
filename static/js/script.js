document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfo = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoDescription = document.getElementById('video-description');
    const convertBtn = document.getElementById('convert-btn');
    const conversionProgress = document.getElementById('conversion-progress');
    const progressBar = document.getElementById('progress-bar');
    const downloadSection = document.getElementById('download-section');
    const downloadBtn = document.getElementById('download-btn');
    const manualDownloadBtn = document.getElementById('manual-download-btn');

    fetchInfoBtn.addEventListener('click', fetchVideoInfo);
    convertBtn.addEventListener('click', convertVideo);
    downloadBtn.addEventListener('click', downloadMP3);
    manualDownloadBtn.addEventListener('click', manualDownload);

    function fetchVideoInfo() {
        const videoUrl = videoUrlInput.value;
        if (!videoUrl) return;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/get_video_info', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                videoThumbnail.src = response.thumbnail;
                videoTitle.textContent = response.title;
                videoDescription.textContent = response.description;
                videoInfo.classList.remove('d-none');
            } else {
                alert('Error fetching video information');
            }
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function convertVideo() {
        const videoUrl = videoUrlInput.value;
        if (!videoUrl) return;

        convertBtn.disabled = true;
        conversionProgress.classList.remove('d-none');
        downloadSection.classList.add('d-none');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/convert', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                downloadBtn.setAttribute('data-filename', response.filename);
                downloadBtn.textContent = `Download MP3 (${formatFileSize(response.filesize)})`;
                downloadSection.classList.remove('d-none');
                convertBtn.disabled = false;
            } else {
                alert('Error converting video');
                convertBtn.disabled = false;
            }
        };
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressBar.setAttribute('aria-valuenow', percentComplete);
                progressBar.textContent = percentComplete.toFixed(0) + '%';
            }
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function downloadMP3() {
        const filename = downloadBtn.getAttribute('data-filename');
        if (!filename) return;

        window.location.href = '/download/' + encodeURIComponent(filename);
    }

    function manualDownload() {
        const filename = downloadBtn.getAttribute('data-filename');
        if (!filename) return;

        const link = document.createElement('a');
        link.href = '/download/' + encodeURIComponent(filename);
        link.download = filename;
        link.click();
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }
});
