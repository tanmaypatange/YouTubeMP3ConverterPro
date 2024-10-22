document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const fetchInfoBtn = document.getElementById('fetch-info');
    const videoInfo = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const downloadBtn = document.getElementById('download-btn');
    const conversionProgress = document.getElementById('conversion-progress');
    const progressBar = document.getElementById('progress-bar');

    fetchInfoBtn.addEventListener('click', fetchVideoInfo);
    downloadBtn.addEventListener('click', convertAndDownload);

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
                videoInfo.classList.remove('d-none');
                downloadBtn.disabled = false;
            } else {
                alert('Error fetching video information');
            }
        };
        xhr.send('video_url=' + encodeURIComponent(videoUrl));
    }

    function convertAndDownload() {
        const videoUrl = videoUrlInput.value;
        if (!videoUrl) return;

        downloadBtn.disabled = true;
        conversionProgress.classList.remove('d-none');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/convert', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                downloadFile(response.filename);
                downloadBtn.disabled = false;
                conversionProgress.classList.add('d-none');
            } else {
                alert('Error converting video');
                downloadBtn.disabled = false;
                conversionProgress.classList.add('d-none');
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

    function downloadFile(filename) {
        window.location.href = '/download/' + encodeURIComponent(filename);
    }
});
