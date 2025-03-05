import React, { useState, useRef } from 'react';

// Icons
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const VolumeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const FullscreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

const VideoPlaceholderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-12 h-12 fill-gray-400 mb-2">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
  </svg>
);

const ReelCard = ({ reel }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };
  
  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md transition-all duration-200 flex flex-col h-full hover:-translate-y-1 hover:shadow-lg">
      <div 
        className="relative w-full h-[280px] overflow-hidden bg-gray-200"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {reel.embedHtml ? (
          <div 
            className="w-full h-full" 
            dangerouslySetInnerHTML={{ __html: reel.embedHtml }} 
          />
        ) : reel.video_url ? (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              loop 
              playsInline 
              className="w-full h-full object-cover"
            >
              <source src={reel.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {isHovering && (
              <div className="absolute inset-0 bg-black/10 flex justify-center items-center">
                <div className="flex gap-2">
                  <button 
                    onClick={handlePlayPause} 
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center transition hover:bg-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button 
                    onClick={handleMute} 
                    aria-label="Toggle mute"
                    className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center transition hover:bg-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <VolumeIcon />
                  </button>
                  <button 
                    onClick={handleFullscreen} 
                    aria-label="Fullscreen"
                    className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center transition hover:bg-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FullscreenIcon />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
            <VideoPlaceholderIcon />
            <p>No video available</p>
          </div>
        )}
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-semibold mb-2 text-gray-900 font-headings">{reel.title || 'Untitled Reel'}</h3>
        {reel.description && <p className="text-gray-600 flex-grow leading-relaxed">{reel.description}</p>}
      </div>
    </div>
  );
};

export default ReelCard;
