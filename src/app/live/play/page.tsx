'use client';

import {
  AlertCircle,
  ArrowLeft,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Signal,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import PageLayout from '@/components/PageLayout';

import { LiveChannel } from '@/types/live';

export default function LivePlayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [channel, setChannel] = useState<LiveChannel | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [streamQuality, setStreamQuality] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<
    'connecting' | 'connected' | 'error' | 'idle'
  >('idle');

  // Parse URL parameters
  useEffect(() => {
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const urls = searchParams.get('urls')?.split(',') || [];
    const category = searchParams.get('category');
    const quality = searchParams.get('quality') as LiveChannel['quality'];
    const format = searchParams.get('format') as LiveChannel['format'];

    if (id && name && urls.length > 0) {
      setChannel({
        id,
        name,
        urls,
        category: category || 'Live',
        quality,
        format,
        isActive: true,
      });
    } else {
      setError('Invalid channel parameters');
      setIsLoading(false);
    }
  }, [searchParams]);

  const loadVideo = useCallback(async () => {
    if (!channel || !videoRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      setStreamStatus('connecting');

      const video = videoRef.current;
      const originalUrl = channel.urls[currentUrlIndex];
      const url = processUrl(originalUrl);

      // Check if HLS.js is supported for .m3u8 files
      if (url.includes('.m3u8') && window.Hls?.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setStreamStatus('connected');

          // 检测流质量
          if (hls.levels && hls.levels.length > 0) {
            const currentLevel = hls.levels[hls.currentLevel];
            if (currentLevel) {
              setStreamQuality(`${currentLevel.height}p`);
            }
          }

          video.play().catch(() => {
            setError('播放失败，请尝试其他源');
            setStreamStatus('error');
          });
        });

        hls.on(
          window.Hls.Events.ERROR,
          (_event: string, data: { fatal?: boolean; details?: string }) => {
            if (data.fatal) {
              setError(`播放错误: ${data.details}`);
              setIsLoading(false);
              setStreamStatus('error');
            }
          }
        );

        // 存储 hls 实例以便后续清理
        video.hls = hls;
      } else {
        // Fallback to native video playback
        video.src = url;
        video.load();

        video.addEventListener('loadeddata', () => {
          setIsLoading(false);
          setStreamStatus('connected');
          video.play().catch(() => {
            setError('播放失败，请尝试其他源');
            setStreamStatus('error');
          });
        });

        video.addEventListener('error', () => {
          setError('加载视频流失败');
          setIsLoading(false);
          setStreamStatus('error');
        });
      }

      // Set up video event listeners
      video.addEventListener('play', () => setIsPlaying(true));
      video.addEventListener('pause', () => setIsPlaying(false));
      video.addEventListener('volumechange', () => {
        setVolume(video.volume);
        setIsMuted(video.muted);
      });
    } catch (err) {
      setError('初始化播放器失败');
      setIsLoading(false);
      setStreamStatus('error');
    }
  }, [channel, currentUrlIndex]);

  // Load video when channel is set
  useEffect(() => {
    if (channel && videoRef.current) {
      loadVideo();
    }
  }, [channel, currentUrlIndex, loadVideo]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls, isPlaying]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const processUrl = (url: string) => {
    // 如果当前页面是 HTTP 访问，而直播源是 HTTPS，则使用代理
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      url.startsWith('https://')
    ) {
      // 提取域名和路径
      const urlObj = new URL(url);
      const host = urlObj.host;
      const pathname = urlObj.pathname;
      const search = urlObj.search;

      // 使用代理路径
      return `/proxy/${host}${pathname}${search}`;
    }

    // 如果是 HTTP 源但需要代理，也可以使用 httpproxy
    if (
      typeof window !== 'undefined' &&
      url.startsWith('http://') &&
      window.location.protocol === 'https:'
    ) {
      const urlObj = new URL(url);
      const host = urlObj.host;
      const pathname = urlObj.pathname;
      const search = urlObj.search;

      return `/httpproxy/${host}${pathname}${search}`;
    }

    return url;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        setError('Failed to start playback');
      });
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;

    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;

    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleRetry = () => {
    if (!channel) return;

    // 清理当前的 HLS 实例
    if (videoRef.current?.hls) {
      videoRef.current.hls.destroy();
      videoRef.current.hls = null;
    }

    if (currentUrlIndex < channel.urls.length - 1) {
      setCurrentUrlIndex((prev) => prev + 1);
    } else {
      setCurrentUrlIndex(0);
      loadVideo();
    }
  };

  const handleSourceSelect = (index: number) => {
    if (!channel || index === currentUrlIndex) return;

    // 清理当前的 HLS 实例
    if (videoRef.current?.hls) {
      videoRef.current.hls.destroy();
      videoRef.current.hls = null;
    }

    setCurrentUrlIndex(index);
    setShowSourceSelector(false);
  };

  const getStreamStatusIcon = () => {
    switch (streamStatus) {
      case 'connecting':
        return <Wifi className='w-4 h-4 animate-pulse text-yellow-400' />;
      case 'connected':
        return <Signal className='w-4 h-4 text-green-400' />;
      case 'error':
        return <AlertCircle className='w-4 h-4 text-red-400' />;
      default:
        return <Monitor className='w-4 h-4 text-gray-400' />;
    }
  };

  const getStreamStatusText = () => {
    switch (streamStatus) {
      case 'connecting':
        return '连接中...';
      case 'connected':
        return '已连接';
      case 'error':
        return '连接失败';
      default:
        return '准备中';
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);

    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Set new timeout to hide controls after 3 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    // Hide controls when mouse leaves the video area
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (!channel) {
    return (
      <PageLayout>
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
              频道参数错误
            </h2>
            <p className='text-gray-600 dark:text-gray-300 mb-4'>
              频道参数无效或缺失
            </p>
            <button
              onClick={() => router.push('/live')}
              className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
            >
              返回直播列表
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className='bg-black min-h-screen relative'>
        {/* Video Player */}
        <div
          className='relative w-full h-screen'
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <video
            ref={videoRef}
            className='w-full h-full object-contain'
            playsInline
            autoPlay
            muted={isMuted}
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className='absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-6'></div>
                <p className='text-white text-lg mb-2'>加载直播流中...</p>
                <div className='flex items-center justify-center space-x-2 text-gray-300'>
                  {getStreamStatusIcon()}
                  <span className='text-sm'>{getStreamStatusText()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className='absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center'>
              <div className='text-center max-w-md mx-4'>
                <AlertCircle className='w-16 h-16 text-red-500 mx-auto mb-6' />
                <h3 className='text-white text-xl font-semibold mb-4'>
                  播放出错
                </h3>
                <p className='text-gray-300 mb-6 leading-relaxed'>{error}</p>
                <div className='space-y-3'>
                  <div className='flex space-x-3 justify-center'>
                    <button
                      onClick={handleRetry}
                      className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium'
                    >
                      <RotateCcw className='w-5 h-5' />
                      <span>
                        {currentUrlIndex < channel.urls.length - 1
                          ? '尝试下一源'
                          : '重新连接'}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowSourceSelector(true)}
                      className='bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium'
                    >
                      <Settings className='w-5 h-5' />
                      <span>选择源</span>
                    </button>
                  </div>
                  <button
                    onClick={() => router.push('/live')}
                    className='text-gray-400 hover:text-white transition-colors font-medium'
                  >
                    返回直播列表
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Controls Overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none transition-opacity duration-300 ${
              showControls && !error ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Top Controls */}
            <div className='absolute top-0 left-0 right-0 p-6 pointer-events-auto'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <button
                    onClick={() => router.push('/live')}
                    className='text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50'
                    aria-label='返回直播列表'
                  >
                    <ArrowLeft className='w-6 h-6' />
                  </button>
                  <div className='bg-black bg-opacity-30 rounded-lg px-4 py-2 backdrop-blur-sm'>
                    <h1 className='text-white font-semibold text-lg'>
                      {channel.name}
                    </h1>
                    <div className='flex items-center space-x-3 mt-1'>
                      <p className='text-gray-300 text-sm'>
                        {channel.category}
                      </p>
                      <div className='flex items-center space-x-1'>
                        {getStreamStatusIcon()}
                        <span className='text-xs text-gray-300'>
                          {getStreamStatusText()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-center space-x-2'>
                  {streamQuality && (
                    <span className='bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium'>
                      {streamQuality}
                    </span>
                  )}
                  {channel.quality && (
                    <span className='bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium'>
                      {channel.quality}
                    </span>
                  )}
                  {channel.urls.length > 1 && (
                    <span className='bg-gray-600 text-white text-xs px-3 py-1 rounded-full font-medium'>
                      源 {currentUrlIndex + 1}/{channel.urls.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className='absolute bottom-0 left-0 right-0 p-6 pointer-events-auto'>
              <div className='bg-black bg-opacity-40 rounded-lg backdrop-blur-sm p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-4'>
                    <button
                      onClick={handlePlayPause}
                      className='text-white hover:text-gray-300 transition-all duration-200 p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30'
                    >
                      {isPlaying ? (
                        <Pause className='w-8 h-8' fill='currentColor' />
                      ) : (
                        <Play className='w-8 h-8 ml-1' fill='currentColor' />
                      )}
                    </button>

                    <div className='flex items-center space-x-3'>
                      <button
                        onClick={handleMuteToggle}
                        className='text-white hover:text-gray-300 transition-colors p-2 rounded'
                      >
                        {isMuted ? (
                          <VolumeX className='w-6 h-6' />
                        ) : (
                          <Volume2 className='w-6 h-6' />
                        )}
                      </button>

                      <div className='flex items-center space-x-2'>
                        <span className='text-white text-sm font-medium w-8'>
                          {Math.round((isMuted ? 0 : volume) * 100)}
                        </span>
                        <input
                          type='range'
                          min='0'
                          max='1'
                          step='0.1'
                          value={isMuted ? 0 : volume}
                          onChange={(e) =>
                            handleVolumeChange(parseFloat(e.target.value))
                          }
                          className='w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer volume-slider'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    {channel.urls.length > 1 && (
                      <button
                        onClick={() => setShowSourceSelector(true)}
                        className='text-white hover:text-gray-300 transition-colors p-2 rounded bg-white bg-opacity-10 hover:bg-opacity-20'
                        title='切换源'
                      >
                        <Settings className='w-5 h-5' />
                      </button>
                    )}

                    <button
                      onClick={handleFullscreen}
                      className='text-white hover:text-gray-300 transition-colors p-2 rounded bg-white bg-opacity-10 hover:bg-opacity-20'
                      title={isFullscreen ? '退出全屏' : '进入全屏'}
                    >
                      {isFullscreen ? (
                        <Minimize className='w-5 h-5' />
                      ) : (
                        <Maximize className='w-5 h-5' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source Selector Modal */}
        {showSourceSelector && (
          <div className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4'>
            <div className='bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl'>
              <div className='p-6 border-b border-gray-700'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-white text-xl font-semibold'>
                    选择播放源
                  </h3>
                  <button
                    onClick={() => setShowSourceSelector(false)}
                    className='text-gray-400 hover:text-white transition-colors p-1'
                  >
                    <ArrowLeft className='w-6 h-6' />
                  </button>
                </div>
                <p className='text-gray-400 text-sm mt-2'>
                  共 {channel.urls.length} 个源，当前使用源{' '}
                  {currentUrlIndex + 1}
                </p>
              </div>

              <div className='max-h-96 overflow-y-auto'>
                {channel.urls.map((url, index) => {
                  const isActive = index === currentUrlIndex;
                  const urlObj = new URL(
                    url.startsWith('/')
                      ? `${window.location.origin}${url}`
                      : url
                  );
                  const domain = urlObj.hostname;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSourceSelect(index)}
                      className={`w-full p-4 text-left border-b border-gray-700 transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 bg-opacity-20 border-blue-500'
                          : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center space-x-3'>
                            <div
                              className={`w-3 h-3 rounded-full ${
                                isActive
                                  ? 'bg-blue-500'
                                  : streamStatus === 'connected' &&
                                    index === currentUrlIndex
                                  ? 'bg-green-500'
                                  : 'bg-gray-500'
                              }`}
                            />
                            <div>
                              <p className='text-white font-medium'>
                                源 {index + 1}
                                {isActive && (
                                  <span className='ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded-full'>
                                    当前
                                  </span>
                                )}
                              </p>
                              <p className='text-gray-400 text-sm truncate'>
                                {domain}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center space-x-2'>
                          {url.includes('.m3u8') && (
                            <span className='bg-green-600 text-white text-xs px-2 py-1 rounded'>
                              HLS
                            </span>
                          )}
                          {url.includes('https://') && (
                            <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded'>
                              HTTPS
                            </span>
                          )}
                          {isActive && streamStatus === 'connected' && (
                            <Signal className='w-4 h-4 text-green-400' />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className='p-6 bg-gray-800 bg-opacity-50'>
                <div className='flex space-x-3'>
                  <button
                    onClick={() => setShowSourceSelector(false)}
                    className='flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors font-medium'
                  >
                    取消
                  </button>
                  <button
                    onClick={handleRetry}
                    className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2'
                  >
                    <RotateCcw className='w-4 h-4' />
                    <span>重新连接</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
