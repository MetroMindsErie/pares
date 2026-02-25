import React, { useState, useRef, useEffect } from 'react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);

  // Ensure we have a valid video URL - try multiple property names
  const videoUrl = reel.media_url || reel.video_url || reel.source;
  
  // Ensure we have a valid thumbnail URL
  const thumbnailUrl = reel.thumbnail_url || 
                      reel.picture || 
                      (videoUrl ? null : '/default-thumbnail.jpg');
  
  // Generate a title from available data
  const title = reel.title || 
                reel.caption?.substring(0, 30) + (reel.caption?.length > 30 ? '...' : '') || 
                'Facebook Video';
  
  // Format the date
  const formattedDate = reel.created_at ? 
    new Date(reel.created_at).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }) : '';

  // Permalink for the video
  const permalink = reel.permalink || 
                   `https://www.facebook.com/${reel.facebook_reel_id}` || 
                   `https://www.facebook.com/${reel.id}`;

  // Handle play/pause
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        // Silent catch - no debug log
      });
    }
  };

  // Handle mute/unmute
  const handleMuteToggle = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handle fullscreen
  const handleFullscreen = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (videoRef.current.webkitRequestFullscreen) {
      videoRef.current.webkitRequestFullscreen();
    } else if (videoRef.current.msRequestFullscreen) {
      videoRef.current.msRequestFullscreen();
    }
  };

  // Track video playing state
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Autoplay when visible (using IntersectionObserver)
  useEffect(() => {
    if (!videoRef.current || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // When the video is visible, prepare it for autoplay
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {
              // Silent catch - no debug log
            });
          }
        } else {
          // Pause when not visible
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
      },
      { threshold: 0.5 } // 50% of the element must be visible
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="bg-white rounded-lg overflow-hidden shadow-md transition-all duration-200 flex flex-col h-full hover:-translate-y-1 hover:shadow-lg"
      ref={cardRef}
    >
      <div 
        className="relative w-full h-[280px] overflow-hidden bg-gray-200 cursor-pointer"
        onMouseEnter={() => {
          setIsHovering(true);
          setShowControls(true);
        }}
        onMouseLeave={() => {
          setIsHovering(false);
          setTimeout(() => setShowControls(false), 2000);
        }}
        onClick={handlePlayPause}
      >
        {videoUrl ? (
          <>
            <video 
              ref={videoRef}
              poster={thumbnailUrl}
              className="w-full h-full object-cover"
              preload="metadata"
              muted={isMuted}
              playsInline
              loop
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Play/Pause overlay button */}
            <div 
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying && !isHovering ? 'opacity-0' : 'opacity-100 bg-black/30'}`}
              onClick={handlePlayPause}
            >
              {!isPlaying && (
                <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center transition hover:bg-white hover:scale-105">
                  <svg className="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                  </svg>
                </div>
              )}
            </div>
            
            {/* Video controls */}
            {showControls && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause();
                  }}
                  className="text-white p-1 hover:bg-white/20 rounded"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handleMuteToggle} 
                    className="text-white p-1 hover:bg-white/20 rounded"
                  >
                    {isMuted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <button 
                    onClick={handleFullscreen} 
                    className="text-white p-1 hover:bg-white/20 rounded"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : thumbnailUrl ? (
          <div className="relative w-full h-full">
            <img 
              src={thumbnailUrl} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = '/default-thumbnail.jpg';
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-center">
              <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                </svg>
              </div>
              <p className="mt-2 text-white text-sm">No video available</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p>No media available</p>
          </div>
        )}
      </div>
      
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2" title={title}>
            {title}
          </h3>
        </div>
        
        {formattedDate && (
          <p className="text-sm text-gray-500 mb-2">{formattedDate}</p>
        )}
        
        {reel.caption && (
          <p className="text-gray-600 flex-grow leading-relaxed line-clamp-3">
            {reel.caption}
          </p>
        )}
        
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-teal-600 hover:text-teal-800 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          View on Facebook
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        {videoUrl && (
          <button
            onClick={handlePlayPause}
            className="inline-flex items-center text-sm text-teal-600 hover:text-teal-800 font-medium mt-2"
          >
            {isPlaying ? 'Pause' : 'Play'} Video
            <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
              {isPlaying ? (
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ReelCard;
