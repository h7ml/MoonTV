// Global type declarations for video players and live streaming

declare global {
  interface Window {
    Hls: typeof import('hls.js').default;
  }
  
  interface HTMLVideoElement {
    hls?: import('hls.js').default;
  }
}

// HLS.js related types
declare module 'hls.js' {
  interface HlsConfig {
    debug?: boolean;
    enableWorker?: boolean;
    lowLatencyMode?: boolean;
    backBufferLength?: number;
    maxBufferLength?: number;
    maxMaxBufferLength?: number;
    startPosition?: number;
    defaultAudioCodec?: string;
    fragLoadingTimeOut?: number;
    manifestLoadingTimeOut?: number;
    levelLoadingTimeOut?: number;
  }

  interface HlsEventData {
    [key: string]: any;
  }

  interface HlsEvents {
    MEDIA_ATTACHED: 'hlsMediaAttached';
    MEDIA_DETACHED: 'hlsMediaDetached';
    BUFFER_CREATED: 'hlsBufferCreated';
    BUFFER_APPENDING: 'hlsBufferAppending';
    BUFFER_APPENDED: 'hlsBufferAppended';
    BUFFER_EOS: 'hlsBufferEos';
    BUFFER_FLUSHING: 'hlsBufferFlushing';
    BUFFER_FLUSHED: 'hlsBufferFlushed';
    MANIFEST_LOADING: 'hlsManifestLoading';
    MANIFEST_LOADED: 'hlsManifestLoaded';
    MANIFEST_PARSED: 'hlsManifestParsed';
    LEVEL_SWITCHING: 'hlsLevelSwitching';
    LEVEL_SWITCHED: 'hlsLevelSwitched';
    LEVEL_LOADING: 'hlsLevelLoading';
    LEVEL_LOADED: 'hlsLevelLoaded';
    LEVEL_UPDATED: 'hlsLevelUpdated';
    FRAG_LOADING: 'hlsFragLoading';
    FRAG_LOADED: 'hlsFragLoaded';
    FRAG_PARSING: 'hlsFragParsing';
    FRAG_PARSED: 'hlsFragParsed';
    FRAG_BUFFERED: 'hlsFragBuffered';
    FRAG_CHANGED: 'hlsFragChanged';
    FPS_DROP: 'hlsFpsDrop';
    FPS_DROP_LEVEL_CAPPING: 'hlsFpsDropLevelCapping';
    ERROR: 'hlsError';
    DESTROYING: 'hlsDestroying';
    KEY_LOADING: 'hlsKeyLoading';
    KEY_LOADED: 'hlsKeyLoaded';
    STREAM_STATE_CHANGE: 'hlsStreamStateChange';
  }

  interface HlsErrorData {
    type: string;
    details: string;
    fatal: boolean;
    reason?: string;
    level?: number;
    url?: string;
    response?: {
      code: number;
      text: string;
    };
    networkDetails?: any;
  }

  class Hls {
    static isSupported(): boolean;
    static Events: HlsEvents;
    static ErrorTypes: {
      NETWORK_ERROR: 'networkError';
      MEDIA_ERROR: 'mediaError';
      KEY_SYSTEM_ERROR: 'keySystemError';
      MUX_ERROR: 'muxError';
      OTHER_ERROR: 'otherError';
    };
    static ErrorDetails: {
      KEY_LOAD_ERROR: 'keyLoadError';
      KEY_LOAD_TIMEOUT: 'keyLoadTimeout';
      MANIFEST_LOAD_ERROR: 'manifestLoadError';
      MANIFEST_LOAD_TIMEOUT: 'manifestLoadTimeout';
      MANIFEST_PARSING_ERROR: 'manifestParsingError';
      MANIFEST_INCOMPATIBLE_CODECS_ERROR: 'manifestIncompatibleCodecsError';
      LEVEL_LOAD_ERROR: 'levelLoadError';
      LEVEL_LOAD_TIMEOUT: 'levelLoadTimeout';
      LEVEL_SWITCH_ERROR: 'levelSwitchError';
      AUDIO_TRACK_LOAD_ERROR: 'audioTrackLoadError';
      AUDIO_TRACK_LOAD_TIMEOUT: 'audioTrackLoadTimeout';
      FRAG_LOAD_ERROR: 'fragLoadError';
      FRAG_LOAD_TIMEOUT: 'fragLoadTimeout';
      FRAG_DECRYPT_ERROR: 'fragDecryptError';
      FRAG_PARSING_ERROR: 'fragParsingError';
      REMUX_ALLOC_ERROR: 'remuxAllocError';
      KEY_LOAD_ERROR: 'keyLoadError';
      KEY_LOAD_TIMEOUT: 'keyLoadTimeout';
      BUFFER_ADD_CODEC_ERROR: 'bufferAddCodecError';
      BUFFER_INCOMPATIBLE_CODECS_ERROR: 'bufferIncompatibleCodecsError';
      BUFFER_APPEND_ERROR: 'bufferAppendError';
      BUFFER_APPENDING_ERROR: 'bufferAppendingError';
      BUFFER_STALLED_ERROR: 'bufferStalledError';
      BUFFER_FULL_ERROR: 'bufferFullError';
      BUFFER_SEEK_OVER_HOLE: 'bufferSeekOverHole';
      BUFFER_NUDGE_ON_STALL: 'bufferNudgeOnStall';
    };

    constructor(config?: Partial<HlsConfig>);

    destroy(): void;
    attachMedia(media: HTMLMediaElement): void;
    detachMedia(): void;
    loadSource(url: string): void;
    startLoad(startPosition?: number): void;
    stopLoad(): void;
    swapAudioCodec(): void;
    recoverMediaError(): void;
    
    on(event: string, listener: (event: string, data: HlsEventData) => void): void;
    off(event: string, listener?: (event: string, data: HlsEventData) => void): void;
    once(event: string, listener: (event: string, data: HlsEventData) => void): void;

    readonly media: HTMLMediaElement | null;
    readonly url: string | null;
    readonly levels: Array<{
      width: number;
      height: number;
      bitrate: number;
      name: string;
      codecs: string;
    }>;
    currentLevel: number;
    nextLevel: number;
    loadLevel: number;
    firstLevel: number;
    startLevel: number;
    capLevelToPlayerSize: boolean;
    autoLevelCapping: number;
    autoLevelEnabled: boolean;
    manualLevel: number;
  }

  export default Hls;
}

export {};