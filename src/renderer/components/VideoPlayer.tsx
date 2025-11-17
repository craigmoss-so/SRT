import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Simple approach: Use MSE (Media Source Extensions) to play MPEG-TS directly
    // Or poll for HLS segments and play them
    const checkInterval = setInterval(async () => {
      try {
        // In production, you'd serve the HLS stream via a local HTTP server
        // For now, we'll display a message
        setError('Stream player ready - waiting for stream data');
      } catch (err) {
        console.error('Stream check error:', err);
      }
    }, 2000);

    // Alternative: Use a simple video source if available
    // This will work once we implement a local HTTP server for HLS
    const streamUrl = 'http://localhost:8080/stream/stream.m3u8';

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(null);
        video.play().catch((err) => {
          console.error('Auto-play failed:', err);
          setError('Click to play');
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Waiting for stream...');
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.loadSource(streamUrl);
                }
              }, 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Stream error - retrying...');
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.loadSource(streamUrl);
                }
              }, 2000);
              break;
          }
        }
      });

      // Try to load the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch((err) => {
          console.error('Auto-play failed:', err);
          setError('Click to play');
        });
      });
    } else {
      setError('HLS not supported in this browser');
    }

    return () => {
      clearInterval(checkInterval);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error('Play failed:', err);
      });
      setError(null);
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="max-w-full max-h-full"
        controls
        muted
        playsInline
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Waiting for stream...</p>
            <p className="text-slate-400 text-sm mt-2">The video will appear when data arrives</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white text-lg mb-2">{error}</p>
            <button
              onClick={handlePlayClick}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
