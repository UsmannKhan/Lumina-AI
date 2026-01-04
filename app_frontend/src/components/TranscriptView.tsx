// 'use client';

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { FileTextIcon } from './Icons';
// import { Clock, Play } from 'lucide-react';
// import clsx from 'clsx';

// interface TranscriptSegment {
//   text: string;
//   start: number;
//   duration: number;
// }

// interface TranscriptViewProps {
//   transcript: string;
//   transcriptTimed?: TranscriptSegment[];
//   youtubeId: string;
// }

// function formatTime(seconds: number): string {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = Math.floor(seconds % 60);
  
//   if (hrs > 0) {
//     return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   }
//   return `${mins}:${secs.toString().padStart(2, '0')}`;
// }

// export default function TranscriptView({ 
//   transcript, 
//   transcriptTimed, 
//   youtubeId 
// }: TranscriptViewProps) {
//   const [currentTime, setCurrentTime] = useState(0);
//   const [isAutoScroll, setIsAutoScroll] = useState(true);
//   const [activeIndex, setActiveIndex] = useState(-1);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
//   const isUserScrolling = useRef(false);
//   const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

//   const hasTimedTranscript = transcriptTimed && transcriptTimed.length > 0;

//   // Find active segment based on current time
//   useEffect(() => {
//     if (!hasTimedTranscript) return;

//     const index = transcriptTimed!.findIndex((segment, i) => {
//       const nextSegment = transcriptTimed![i + 1];
//       const segmentEnd = nextSegment ? nextSegment.start : segment.start + segment.duration;
//       return currentTime >= segment.start && currentTime < segmentEnd;
//     });

//     setActiveIndex(index);
//   }, [currentTime, transcriptTimed, hasTimedTranscript]);

//   // Auto-scroll to active segment
//   useEffect(() => {
//     if (!isAutoScroll || activeIndex < 0 || isUserScrolling.current) return;

//     const activeElement = segmentRefs.current[activeIndex];
//     if (activeElement && containerRef.current) {
//       activeElement.scrollIntoView({
//         behavior: 'smooth',
//         block: 'center'
//       });
//     }
//   }, [activeIndex, isAutoScroll]);

//   // Detect user scrolling to pause auto-scroll temporarily
//   const handleScroll = useCallback(() => {
//     isUserScrolling.current = true;
    
//     if (scrollTimeout.current) {
//       clearTimeout(scrollTimeout.current);
//     }
    
//     scrollTimeout.current = setTimeout(() => {
//       isUserScrolling.current = false;
//     }, 3000);
//   }, []);

//   // Handle click on timestamp - seek video
//   const handleTimestampClick = (time: number) => {
//     // Find the YouTube iframe and seek to time
//     const iframe = document.querySelector('iframe[src*="youtube"]') as HTMLIFrameElement;
//     if (iframe && iframe.contentWindow) {
//       // Using postMessage to control YouTube iframe
//       iframe.contentWindow.postMessage(JSON.stringify({
//         event: 'command',
//         func: 'seekTo',
//         args: [time, true]
//       }), '*');
//     }
    
//     // Update local time for immediate feedback
//     setCurrentTime(time);
//   };

//   // If no timed transcript, show plain text
//   if (!hasTimedTranscript) {
//     return (
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="max-w-3xl mx-auto">
//           <div className="flex items-center gap-3 mb-6">
//             <div className="p-2 rounded-lg bg-azure-500/20">
//               <FileTextIcon size={20} className="text-azure-400" />
//             </div>
//             <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
//           </div>
//           <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
//             {transcript}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 flex flex-col overflow-hidden">
//       {/* Header */}
//       <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
//         <div className="max-w-3xl mx-auto flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="p-2 rounded-lg bg-azure-500/20">
//               <FileTextIcon size={20} className="text-azure-400" />
//             </div>
//             <div>
//               <h2 className="font-display font-semibold text-lg text-white">Interactive Transcript</h2>
//               <p className="text-xs text-void-500">{transcriptTimed.length} segments • Click timestamps to jump</p>
//             </div>
//           </div>
          
//           {/* Auto-scroll toggle */}
//           <button
//             onClick={() => setIsAutoScroll(!isAutoScroll)}
//             className={clsx(
//               "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
//               isAutoScroll 
//                 ? "bg-azure-500/20 text-azure-300" 
//                 : "bg-white/[0.05] text-void-400 hover:text-void-200"
//             )}
//           >
//             <Clock size={14} />
//             Auto-scroll {isAutoScroll ? 'ON' : 'OFF'}
//           </button>
//         </div>
//       </div>

//       {/* Transcript content */}
//       <div 
//         ref={containerRef}
//         onScroll={handleScroll}
//         className="flex-1 overflow-y-auto p-6"
//       >
//         <div className="max-w-3xl mx-auto space-y-1">
//           {transcriptTimed.map((segment, index) => (
//             <button
//               key={index}
//               ref={el => { segmentRefs.current[index] = el; }}
//               onClick={() => handleTimestampClick(segment.start)}
//               className={clsx(
//                 "w-full text-left px-3 py-2 rounded-lg transition-all group flex gap-3",
//                 activeIndex === index
//                   ? "bg-azure-500/20 border border-azure-500/30"
//                   : "hover:bg-white/[0.03] border border-transparent"
//               )}
//             >
//               {/* Timestamp */}
//               <span className={clsx(
//                 "flex-shrink-0 text-xs font-mono tabular-nums pt-0.5 transition-colors min-w-[45px]",
//                 activeIndex === index 
//                   ? "text-azure-400" 
//                   : "text-void-600 group-hover:text-void-400"
//               )}>
//                 {formatTime(segment.start)}
//               </span>
              
//               {/* Text */}
//               <span className={clsx(
//                 "flex-1 transition-colors leading-relaxed",
//                 activeIndex === index 
//                   ? "text-white" 
//                   : "text-void-300 group-hover:text-void-200"
//               )}>
//                 {segment.text}
//               </span>

//               {/* Play indicator for active */}
//               {activeIndex === index && (
//                 <span className="flex-shrink-0 text-azure-400">
//                   <Play size={14} fill="currentColor" />
//                 </span>
//               )}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileTextIcon } from './Icons';
import clsx from 'clsx';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptViewProps {
  transcript: string;
  transcriptTimed?: TranscriptSegment[];
  youtubeId: string;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Declare YouTube types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

export default function TranscriptView({ 
  transcript, 
  transcriptTimed, 
  youtubeId 
}: TranscriptViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const hasTimedTranscript = transcriptTimed && transcriptTimed.length > 0;

  // Initialize YouTube API
  useEffect(() => {
    if (!hasTimedTranscript) return;

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Wait for API to be ready, then attach to existing iframe
    const initPlayer = () => {
      const iframe = document.querySelector(`iframe[src*="${youtubeId}"]`) as HTMLIFrameElement;
      if (iframe && window.YT && window.YT.Player) {
        try {
          playerRef.current = new window.YT.Player(iframe, {
            events: {
              onReady: (event) => {
                console.log('YouTube player ready');
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  startTimeTracking();
                } else {
                  setIsPlaying(false);
                  stopTimeTracking();
                }
              }
            }
          });
        } catch (e) {
          console.log('Player already initialized or error:', e);
        }
      }
    };

    // Check if YT is already loaded
    if (window.YT && window.YT.Player) {
      setTimeout(initPlayer, 500);
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopTimeTracking();
    };
  }, [youtubeId, hasTimedTranscript]);

  const startTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) return;
    
    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = playerRef.current.getCurrentTime();
          setCurrentTime(time);
        } catch (e) {
          // Player might not be ready
        }
      }
    }, 250); // Update 4 times per second
  }, []);

  const stopTimeTracking = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  // Find active segment based on current time
  useEffect(() => {
    if (!hasTimedTranscript || !transcriptTimed) return;

    const index = transcriptTimed.findIndex((segment, i) => {
      const nextSegment = transcriptTimed[i + 1];
      const segmentEnd = nextSegment ? nextSegment.start : segment.start + segment.duration;
      return currentTime >= segment.start && currentTime < segmentEnd;
    });

    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [currentTime, transcriptTimed, hasTimedTranscript, activeIndex]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (!isAutoScroll || activeIndex < 0 || isUserScrolling.current) return;

    const activeElement = segmentRefs.current[activeIndex];
    if (activeElement && containerRef.current) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, isAutoScroll]);

  // Detect user scrolling to pause auto-scroll temporarily
  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 3000);
  }, []);

  // Handle click on timestamp - seek video
  const handleTimestampClick = (time: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, true);
    } else {
      // Fallback: postMessage method
      const iframe = document.querySelector(`iframe[src*="${youtubeId}"]`) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [time, true]
        }), '*');
      }
    }
    setCurrentTime(time);
  };

  // If no timed transcript, show plain text
  if (!hasTimedTranscript) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-azure-500/20">
              <FileTextIcon size={20} className="text-azure-400" />
            </div>
            <h2 className="font-display font-semibold text-xl text-white">Full Transcript</h2>
          </div>
          <div className="text-void-300 leading-relaxed whitespace-pre-wrap font-body">
            {transcript}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-azure-500/20">
              <FileTextIcon size={20} className="text-azure-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Transcript</h2>
              <p className="text-xs text-void-500">
                Click to jump • {isPlaying ? 'Playing' : 'Paused'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Current time display */}
            {/* <span className="text-sm font-mono text-void-400 mr-2">
              {formatTime(currentTime)}
            </span> */}
            
            {/* Auto-scroll toggle */}
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isAutoScroll 
                  ? "bg-azure-500/20 text-azure-300" 
                  : "bg-white/[0.05] text-void-400 hover:text-void-200"
              )}
            >
              {/* <Clock size={14} /> */}
              <span className="hidden sm:inline">Auto-scroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transcript content */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6"
      >
        <div className="max-w-3xl mx-auto space-y-1">
          {transcriptTimed.map((segment, index) => (
            <button
              key={index}
              ref={el => { segmentRefs.current[index] = el; }}
              onClick={() => handleTimestampClick(segment.start)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-lg transition-all group flex gap-3",
                activeIndex === index
                  ? "bg-azure-500/20 border border-azure-500/30"
                  : "hover:bg-white/[0.03] border border-transparent"
              )}
            >
              {/* Timestamp */}
              <span className={clsx(
                "flex-shrink-0 text-xs font-mono tabular-nums pt-0.5 transition-colors min-w-[45px]",
                activeIndex === index 
                  ? "text-azure-400" 
                  : "text-void-600 group-hover:text-void-400"
              )}>
                {formatTime(segment.start)}
              </span>
              
              {/* Text */}
              <span className={clsx(
                "flex-1 transition-colors leading-relaxed",
                activeIndex === index 
                  ? "text-white" 
                  : "text-void-300 group-hover:text-void-200"
              )}>
                {segment.text}
              </span>

              {/* Play indicator for active */}
              {/* {activeIndex === index && isPlaying && (
                <span className="flex-shrink-0 text-azure-400 animate-pulse">
                  <Play size={14} fill="currentColor" />
                </span>
              )} */}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}