#!/bin/bash

rm -f yt-dlp

curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod a+rx yt-dlp

if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg não encontrado, baixando versão estática..."
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
    tar -xf ffmpeg.tar.xz --strip-components=1
    chmod a+rx ffmpeg
fi

