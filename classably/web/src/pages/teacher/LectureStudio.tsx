import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Play,
  Square,
  Sparkles,
  HelpCircle,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Globe,
  RefreshCw,
  Zap,
  BookOpen,
  Volume2,
  UserX,
  Users,
  Share2,
  PenTool,
  LayoutGrid,
  PhoneOff,
  Search,
  MessageSquare,
  Bell,
  User,
  ChevronDown,
  ChevronUp,
  Radio,
  Clock
} from 'lucide-react';
import { lectureApi, ocrApi, exportApi, cameraApi } from '../../api/client';
import { LiveSubtitle, RaiseHandItem, QuizQuestion } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getSessionLanguage, setSessionLanguage, clearSessionLanguage } from '../../utils/sessionLanguage';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../../utils/languages';
import { translateClientTextAsync, getCachedTranslation } from '../../utils/clientTranslation';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LanguageSelector } from '../../components/ui/LanguageSelector';

// Module-level persistent recording storage across component unmount/remount
const globalRecordedVideoChunks: Map<number, Blob[]> = new Map();
const globalRecordedAudioChunks: Map<number, Blob[]> = new Map();
const globalSessionStartTimes: Map<number, number> = new Map();

export const LectureStudio: React.FC = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as {
    sessionId?: number;
    subject?: string;
    topic?: string;
    teacherName?: string;
    autoStart?: boolean;
  } | null;

  // Lecture Session State
  const [sessionId, setSessionId] = useState<number | null>(() => locationState?.sessionId || null);
  const sessionIdRef = useRef<number | null>(locationState?.sessionId || null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => !!(locationState?.sessionId && locationState?.autoStart));
  const [subject, setSubject] = useState(() => locationState?.subject || '');
  const [topic, setTopic] = useState(() => locationState?.topic || '');

  // Media Stream & Hardware State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeHardwareStreamsRef = useRef<Set<MediaStream>>(new Set());
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [cameraSourceType, setCameraSourceType] = useState<'webcam' | 'esp32' | 'ip_cam'>('webcam');

  // Live Live Transcript & Subtitles
  const [subtitles, setSubtitles] = useState<LiveSubtitle[]>([]);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [targetLang, setTargetLang] = useState<string>(() => getSessionLanguage(null, 'en'));
  const [isCcEnabled, setIsCcEnabled] = useState(true);

  // Teacher speech language — drives Web Speech API recognition.lang
  const [teacherSpeechLang, setTeacherSpeechLang] = useState<string>(() => getSessionLanguage(null, 'en'));

  const handleLanguageChange = (newLang: string) => {
    setTargetLang(newLang);
    setTeacherSpeechLang(newLang);

    const activeId = sessionIdRef.current || sessionId;
    if (activeId) {
      setSessionLanguage(activeId, newLang);
    } else {
      setSessionLanguage(null, newLang);
    }

    // Broadcast language change to students over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'language_change',
          classroom_id: 1,
          session_id: activeId,
          language: newLang,
        }));
      } catch {}
    }
  };

  // Map language code -> Web Speech API BCP 47 locale
  const getSpeechRecognitionLocale = (code: string): string => {
    const LOCALE_MAP: Record<string, string> = {
      'en': 'en-US', 'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
      'kn': 'kn-IN', 'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN',
      'gu': 'gu-IN', 'pa': 'pa-IN', 'ur': 'ur-IN', 'or': 'or-IN',
      'as': 'as-IN', 'ne': 'ne-NP', 'sa': 'sa-IN', 'ks': 'ks-IN',
      'sd': 'sd-IN', 'kok': 'kok-IN', 'doi': 'doi-IN', 'mai': 'mai-IN',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW',
      'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
      'pt': 'pt-PT', 'ru': 'ru-RU', 'ar': 'ar-SA',
    };
    return LOCALE_MAP[code] || 'en-US';
  };

  // OCR Extraction State
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Raised Hand Queue & AI Quizzes & Connected Students
  const [raiseHandQueue, setRaiseHandQueue] = useState<RaiseHandItem[]>([]);
  const [qaSearchQuery, setQaSearchQuery] = useState('');
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [connectedStudents, setConnectedStudents] = useState<any[]>([]);

  // WebRTC & Signaling Refs
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Web Speech API & MediaRecorder State
  const [isSttActive, setIsSttActive] = useState(false);
  const [isSttSupported, setIsSttSupported] = useState(true);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);
  const subtitleClearTimerRef = useRef<any>(null);
  const lastNegotiationTimeRef = useRef<Map<string, number>>(new Map());
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const subtitleContainerRef = useRef<HTMLDivElement | null>(null);
  const isSessionActiveRef = useRef(false);

  // Keep sessionIdRef in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Auto-scroll subtitles to bottom when new subtitles arrive
  useEffect(() => {
    if (subtitleContainerRef.current) {
      subtitleContainerRef.current.scrollTop = subtitleContainerRef.current.scrollHeight;
    }
  }, [subtitles]);

  const prevTeacherSpeechLangRef = useRef<string>(teacherSpeechLang);

  // Restart speech recognition when teacher speech language changes mid-session
  useEffect(() => {
    if (prevTeacherSpeechLangRef.current === teacherSpeechLang) {
      return;
    }
    prevTeacherSpeechLangRef.current = teacherSpeechLang;
    if (isSessionActiveRef.current && sessionIdRef.current && isSttActive) {
      stopSpeechRecognition();
      setTimeout(() => {
        if (isSessionActiveRef.current && sessionIdRef.current) {
          startSpeechRecognition(sessionIdRef.current, teacherSpeechLang);
        }
      }, 100);
    }
  }, [teacherSpeechLang]);

  const subtitleSeqRef = useRef<number>(Date.now());
  const pendingSubtitlesQueueRef = useRef<any[]>([]);

  const broadcastSubtitle = (subPayload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(subPayload));
      } catch (err) {
        console.warn('[Teacher] WS send error:', err);
      }
    } else {
      // Ensure initial words spoken during startup are not dropped while WebSocket connects
      pendingSubtitlesQueueRef.current.push(subPayload);
      if (pendingSubtitlesQueueRef.current.length > 30) {
        pendingSubtitlesQueueRef.current.shift();
      }
    }
  };

  const getPrecomputedTranslations = (text: string): Record<string, string> => {
    const clean = (text || '').trim();
    if (!clean) return {};
    const translations: Record<string, string> = { en: clean };
    const targetLanguages = ['hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'ur', 'es', 'fr', 'de', 'ar', 'zh-CN', 'ja', 'ko', 'ru'];
    for (const lang of targetLanguages) {
      const cached = getCachedTranslation(clean, lang);
      if (cached && cached !== clean) {
        translations[lang] = cached;
      }
    }
    return translations;
  };

  const lastInterimTextRef = useRef<string>('');
  const recognitionRestartTimerRef = useRef<any>(null);
  const sttWatchdogTimerRef = useRef<any>(null);

  const startSpeechRecognition = (activeSessionId: number, langOverride?: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[STT] SpeechRecognition API not supported in this browser.');
      setIsSttSupported(false);
      return;
    }

    setIsSttSupported(true);
    try {
      if (recognitionRestartTimerRef.current) {
        clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
      }

      if (recognitionRef.current) {
        const existing = recognitionRef.current;
        existing.onend = null;
        existing.onerror = null;
        existing.onresult = null;
        try { existing.abort(); } catch (e) {}
        recognitionRef.current = null;
      }

      const currentLang = langOverride || getSessionLanguage(activeSessionId, teacherSpeechLang);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = getSpeechRecognitionLocale(currentLang);

      recognition.onstart = () => {
        console.log('[STT] Live continuous speech recognition active.');
        setIsSttActive(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          let transcriptText = result[0]?.transcript?.trim() || '';
          if (!transcriptText && result.length > 1) {
            for (let alt = 1; alt < result.length; alt++) {
              if (result[alt]?.transcript?.trim()) {
                transcriptText = result[alt].transcript.trim();
                break;
              }
            }
          }
          if (!transcriptText) continue;

          if (result.isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + transcriptText;
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + transcriptText;
          }
        }

        const cleanFinal = finalTranscript.trim();
        const cleanInterim = interimTranscript.trim();

        // 1. Finalized speech segment
        if (cleanFinal) {
          lastInterimTextRef.current = '';
          subtitleSeqRef.current += 1;
          const seq = subtitleSeqRef.current;
          const finalSubId = Date.now();
          const finalTranslations = getPrecomputedTranslations(cleanFinal);

          // Append to teacher's permanent subtitle list
          setSubtitles((prev) => {
            const withoutInterim = prev.filter((s) => s.id !== finalSubId && s.id < 999999000);
            return [...withoutInterim, {
              id: finalSubId,
              speaker: user?.full_name || 'Educator',
              text: cleanFinal,
              original_text: cleanFinal,
              timestamp: new Date().toLocaleTimeString(),
            }];
          });

          // Broadcast finalized subtitle immediately to students (zero latency)
          const finalPayload = {
            type: 'subtitle',
            role: 'teacher',
            peer_id: 'teacher',
            classroom_id: 1,
            session_id: activeSessionId || sessionIdRef.current,
            seq: seq,
            is_interim: false,
            subtitle: {
              id: finalSubId,
              seq: seq,
              speaker: user?.full_name || 'Educator',
              text: cleanFinal,
              original_text: cleanFinal,
              translations: finalTranslations,
              timestamp: new Date().toLocaleTimeString(),
            },
          };
          broadcastSubtitle(finalPayload);

          // Ingest to backend database asynchronously for notes & history without re-broadcasting
          lectureApi.ingestSubtitle({
            session_id: activeSessionId || sessionIdRef.current || 0,
            text: cleanFinal,
            id: finalSubId,
            speaker_name: user?.full_name || 'Educator',
            target_lang: targetLang,
            broadcast: false,
          }).catch((e) => console.debug('[STT] Background ingest error:', e));

          // Warm translation cache and broadcast translations to students
          const languagesToWarm = ['hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'ur', 'es', 'fr', 'de', 'ja', 'ko', 'zh-CN', 'ar', 'ru'];
          languagesToWarm.forEach((lang) => {
            if (!finalTranslations[lang]) {
              translateClientTextAsync(cleanFinal, lang).then((translated) => {
                if (translated && translated !== cleanFinal) {
                  finalTranslations[lang] = translated;
                  broadcastSubtitle({
                    type: 'subtitle_translation',
                    classroom_id: 1,
                    session_id: activeSessionId || sessionIdRef.current,
                    sub_id: finalSubId,
                    text: cleanFinal,
                    language: lang,
                    translated_text: translated,
                  });
                }
              }).catch(() => {});
            }
          });
        }

        // 2. Progressive interim speech (live streaming words)
        if (cleanInterim) {
          lastInterimTextRef.current = cleanInterim;
          subtitleSeqRef.current += 1;
          const seq = subtitleSeqRef.current;
          const interimSubId = 999999000 + (seq % 1000);

          // Instant UI update for teacher (0ms delay)
          setActiveSubtitleText(cleanInterim);
          if (subtitleClearTimerRef.current) {
            clearTimeout(subtitleClearTimerRef.current);
          }
          subtitleClearTimerRef.current = setTimeout(() => {
            setActiveSubtitleText(null);
          }, 3000);

          // Broadcast interim speech to students immediately
          const interimTranslations = getPrecomputedTranslations(cleanInterim);
          const interimPayload = {
            type: 'subtitle',
            role: 'teacher',
            peer_id: 'teacher',
            classroom_id: 1,
            session_id: activeSessionId || sessionIdRef.current,
            seq: seq,
            is_interim: true,
            subtitle: {
              id: interimSubId,
              seq: seq,
              speaker: user?.full_name || 'Educator',
              text: cleanInterim,
              original_text: cleanInterim,
              translations: interimTranslations,
              timestamp: new Date().toLocaleTimeString(),
            },
          };
          broadcastSubtitle(interimPayload);
        } else if (cleanFinal) {
          // If no interim words, show finalized sentence on teacher overlay
          setActiveSubtitleText(cleanFinal);
          if (subtitleClearTimerRef.current) {
            clearTimeout(subtitleClearTimerRef.current);
          }
          subtitleClearTimerRef.current = setTimeout(() => {
            setActiveSubtitleText(null);
          }, 3000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[STT] Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setIsSttActive(false);
        }
      };

      recognition.onend = () => {
        // Flush any unfinalized interim speech captured right before browser pause
        if (lastInterimTextRef.current && lastInterimTextRef.current.trim()) {
          const buffered = lastInterimTextRef.current.trim();
          lastInterimTextRef.current = '';
          subtitleSeqRef.current += 1;
          const flushSeq = subtitleSeqRef.current;
          const flushSubId = Date.now();
          const flushTrans = getPrecomputedTranslations(buffered);

          setSubtitles((prev) => [
            ...prev.filter((s) => s.id !== flushSubId && s.id < 999999000),
            {
              id: flushSubId,
              speaker: user?.full_name || 'Educator',
              text: buffered,
              original_text: buffered,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);

          broadcastSubtitle({
            type: 'subtitle',
            role: 'teacher',
            peer_id: 'teacher',
            classroom_id: 1,
            session_id: activeSessionId || sessionIdRef.current,
            seq: flushSeq,
            is_interim: false,
            subtitle: {
              id: flushSubId,
              seq: flushSeq,
              speaker: user?.full_name || 'Educator',
              text: buffered,
              original_text: buffered,
              translations: flushTrans,
              timestamp: new Date().toLocaleTimeString(),
            },
          });
        }

        // Continuous speech recognition recovery with fresh instance
        if (isSessionActiveRef.current && recognitionRef.current === recognition) {
          recognitionRef.current = null;
          recognitionRestartTimerRef.current = setTimeout(() => {
            if (isSessionActiveRef.current) {
              startSpeechRecognition(activeSessionId || sessionIdRef.current || 1, langOverride);
            }
          }, 50);
        } else if (recognitionRef.current === recognition) {
          setIsSttActive(false);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (startErr) {
        console.warn('[STT] Recognition start notice:', startErr);
        if (isSessionActiveRef.current) {
          recognitionRestartTimerRef.current = setTimeout(() => {
            if (isSessionActiveRef.current) {
              startSpeechRecognition(activeSessionId, langOverride);
            }
          }, 150);
        }
      }
    } catch (err) {
      console.warn('[STT] Could not initialize SpeechRecognition:', err);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRestartTimerRef.current) {
      clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    if (sttWatchdogTimerRef.current) {
      clearInterval(sttWatchdogTimerRef.current);
      sttWatchdogTimerRef.current = null;
    }
    if (subtitleClearTimerRef.current) {
      clearTimeout(subtitleClearTimerRef.current);
      subtitleClearTimerRef.current = null;
    }
    lastInterimTextRef.current = '';
    setActiveSubtitleText(null);
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      try { rec.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsSttActive(false);
  };

  const startRecording = (stream: MediaStream, targetSessionId: number) => {
    try {
      if (!globalRecordedVideoChunks.has(targetSessionId)) {
        globalRecordedVideoChunks.set(targetSessionId, []);
      }
      if (!globalRecordedAudioChunks.has(targetSessionId)) {
        globalRecordedAudioChunks.set(targetSessionId, []);
      }
      if (!globalSessionStartTimes.has(targetSessionId)) {
        globalSessionStartTimes.set(targetSessionId, Date.now());
      }

      const videoChunkStore = globalRecordedVideoChunks.get(targetSessionId)!;
      const audioChunkStore = globalRecordedAudioChunks.get(targetSessionId)!;

      // 1. Full Video + Audio Recorder
      let videoRecorder: MediaRecorder;
      try {
        videoRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      } catch (e1) {
        try {
          videoRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        } catch (e2) {
          videoRecorder = new MediaRecorder(stream);
        }
      }

      videoRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoChunkStore.push(event.data);
        }
      };

      videoRecorder.start(1000);
      mediaRecorderRef.current = videoRecorder;

      // 2. Dedicated Audio-Only Recorder
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioOnlyStream = new MediaStream(audioTracks);
        let audioRecorder: MediaRecorder;
        try {
          audioRecorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm;codecs=opus' });
        } catch (ea1) {
          try {
            audioRecorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm' });
          } catch (ea2) {
            audioRecorder = new MediaRecorder(audioOnlyStream);
          }
        }

        audioRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunkStore.push(event.data);
          }
        };

        audioRecorder.start(1000);
        audioRecorderRef.current = audioRecorder;
      }

      // 3. Continuous Recording Timer
      const startTime = globalSessionStartTimes.get(targetSessionId) || Date.now();
      const initialElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setRecordingSeconds(initialElapsed);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        const currentElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setRecordingSeconds(currentElapsed);
      }, 1000);

      console.log(`[Teacher Recording] Recording active for session #${targetSessionId}, starting at ${initialElapsed}s.`);
    } catch (err) {
      console.warn('[Teacher] Could not start MediaRecorder:', err);
    }
  };

  const stopRecordingAndUpload = async (activeSessionId: number) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => {
            try { t.enabled = false; t.stop(); } catch {}
          });
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioRecorderRef.current) {
      try {
        if (audioRecorderRef.current.state !== 'inactive') {
          audioRecorderRef.current.stop();
        }
        if (audioRecorderRef.current.stream) {
          audioRecorderRef.current.stream.getTracks().forEach((t) => {
            try { t.enabled = false; t.stop(); } catch {}
          });
        }
      } catch {}
      audioRecorderRef.current = null;
    }

    // Wait 300ms for final ondataavailable chunk events to flush
    await new Promise((r) => setTimeout(r, 300));

    try {
      const videoChunks = globalRecordedVideoChunks.get(activeSessionId) || [];
      const audioChunks = globalRecordedAudioChunks.get(activeSessionId) || [];

      const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
      // Audio-only blob: if audio chunks exist use them; otherwise use videoBlob as fallback
      const audioBlob = audioChunks.length > 0
        ? new Blob(audioChunks, { type: 'audio/webm' })
        : new Blob(videoChunks, { type: 'audio/webm' });

      console.log(`[Teacher Upload] Session #${activeSessionId} Video Size: ${videoBlob.size} bytes, Audio Size: ${audioBlob.size} bytes`);

      if (videoBlob.size > 0 || audioBlob.size > 0) {
        const formData = new FormData();
        if (videoBlob.size > 0) {
          formData.append('video', videoBlob, `lecture_${activeSessionId}.webm`);
        }
        if (audioBlob.size > 0) {
          formData.append('audio', audioBlob, `lecture_${activeSessionId}_audio.webm`);
        }
        const totalDuration = recordingSeconds || Math.max(1, Math.floor((Date.now() - (globalSessionStartTimes.get(activeSessionId) || Date.now())) / 1000));
        formData.append('duration', totalDuration.toString());

        addToast({
          type: 'info',
          title: 'Uploading Recording...',
          description: 'Saving video & audio recording to server.',
        });
        await lectureApi.uploadRecording(activeSessionId, formData);
        addToast({
          type: 'success',
          title: 'Recording Saved',
          description: 'Video and Audio recordings are ready for download.',
        });
      }
    } catch (e) {
      console.error('[Teacher] Failed to upload recording:', e);
    } finally {
      globalRecordedVideoChunks.delete(activeSessionId);
      globalRecordedAudioChunks.delete(activeSessionId);
      globalSessionStartTimes.delete(activeSessionId);
    }
  };

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  const createPeerConnectionForStudent = async (peerId: string, stream: MediaStream) => {
    const activeStream = localStreamRef.current || stream;
    if (!activeStream) {
      console.warn('[Teacher] No active local stream available to send to student');
      return;
    }

    if (peerConnectionsRef.current.has(peerId)) {
      console.log('[Teacher] Closing existing RTCPeerConnection for student:', peerId);
      const existing = peerConnectionsRef.current.get(peerId);
      existing?.close();
      peerConnectionsRef.current.delete(peerId);
      pendingCandidatesRef.current.delete(peerId);
    }

    console.log('[Teacher] Creating new RTCPeerConnection for student:', peerId);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionsRef.current.set(peerId, pc);
    pendingCandidatesRef.current.set(peerId, []);

    if (activeStream.getAudioTracks().length === 0) {
      console.warn('[Teacher] activeStream lacks audio track! Generating audio track fallback...');
      const fallbackAudioTrack = createAudioStreamMixer(activeStream);
      if (fallbackAudioTrack) {
        activeStream.addTrack(fallbackAudioTrack);
      }
    }

    activeStream.getTracks().forEach((track) => {
      console.log(`[Teacher] Adding ${track.kind} track (id: ${track.id}, enabled: ${track.enabled}, state: ${track.readyState}) to RTCPeerConnection`);
      pc.addTrack(track, activeStream);
    });
    console.log('[Teacher] Added active audio & video tracks to RTCPeerConnection for peer:', peerId);

    const senders = pc.getSenders();
    console.log(`[Teacher] RTCPeerConnection getSenders() count: ${senders.length}`);
    senders.forEach((sender, idx) => {
      console.log(`[Teacher] Sender #${idx} -> track kind: ${sender.track?.kind || 'none'}, id: ${sender.track?.id || 'none'}, state: ${sender.track?.readyState || 'none'}`);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[Teacher] ICE candidate sent for peer:', peerId);
        wsRef.current.send(
          JSON.stringify({
            type: 'candidate',
            candidate: event.candidate,
            classroom_id: 1,
            role: 'teacher',
            peer_id: 'teacher',
            target_id: peerId
          })
        );
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Teacher] ICE connection state changes:', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[Teacher] Connection state changes:', pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[Teacher] Signaling state changes:', pc.signalingState);
    };

    pc.onicegatheringstatechange = () => {
      console.log('[Teacher] ICE gathering state changes:', pc.iceGatheringState);
    };

    try {
      console.log('[Teacher] createOffer');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('[Teacher] setLocalDescription');
      console.log('[Teacher] Offer SDP check -> m=video:', offer.sdp?.includes('m=video'), '| m=audio:', offer.sdp?.includes('m=audio'));
      if (!offer.sdp?.includes('m=audio')) {
        console.error('[Teacher] CRITICAL: m=audio is missing from offer SDP!');
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'offer',
            sdp: offer,
            classroom_id: 1,
            role: 'teacher',
            peer_id: 'teacher',
            target_id: peerId
          })
        );
        console.log('[Teacher] offer sent');
      }
    } catch (err) {
      console.error('[Teacher] Error during offer negotiation:', err);
    }
  };

  const processPendingCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current.get(peerId) || [];
    if (queue.length > 0) {
      console.log(`[Teacher] Flushing ${queue.length} queued ICE candidates for peer:`, peerId);
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
          console.log('[Teacher] Queued candidate added for peer:', peerId);
        } catch (err) {
          console.error('[Teacher] Error adding queued candidate:', err);
        }
      }
      pendingCandidatesRef.current.set(peerId, []);
    }
  };

  // Initialize WebRTC & Media Stream
  const initWebRTC = (stream?: MediaStream) => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('[Teacher] Signaling WebSocket already active or connecting');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/events/1`;
    console.log('[Teacher] Connecting signaling WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Teacher] Signaling WebSocket connected');
      // Notify all connected students that teacher is online
      ws.send(JSON.stringify({ type: 'teacher_online', classroom_id: 1, role: 'teacher', peer_id: 'teacher' }));
      console.log('[Teacher] teacher_online broadcast sent');

      // Immediately flush any speech subtitles captured during session startup/reconnection
      while (pendingSubtitlesQueueRef.current.length > 0) {
        const queuedPayload = pendingSubtitlesQueueRef.current.shift();
        try {
          ws.send(JSON.stringify(queuedPayload));
          console.log('[Teacher] Flushed initial startup subtitle:', queuedPayload.subtitle?.text);
        } catch (e) {}
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        const peerId = message.peer_id || message.student_id || 'default_student';

        if (message.type === 'join' || message.type === 'request_offer') {
          console.log('[Teacher] Student joined room / requested offer for peer:', peerId);
          const activeStream = stream || localStreamRef.current;
          if (activeStream) {
            await createPeerConnectionForStudent(peerId, activeStream);
          }
        } else if (message.type === 'answer' && message.sdp) {
          console.log('[Teacher] answer received');
          const pc = peerConnectionsRef.current.get(peerId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            console.log('[Teacher] setRemoteDescription');
            await processPendingCandidates(peerId, pc);
          } else {
            console.warn('[Teacher] No active peer connection found for answer peer:', peerId);
          }
        } else if (message.type === 'candidate' && message.candidate) {
          console.log('[Teacher] ICE candidate received');
          const pc = peerConnectionsRef.current.get(peerId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            console.log('[Teacher] Added ICE candidate immediately for peer:', peerId);
          } else {
            console.log('[Teacher] Remote description not set yet; queuing candidate for peer:', peerId);
            const queue = pendingCandidatesRef.current.get(peerId) || [];
            queue.push(message.candidate);
            pendingCandidatesRef.current.set(peerId, queue);
          }
        }
      } catch (err) {
        console.error('[Teacher] WS message error:', err);
      }
    };
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      addToast({
        type: 'warning',
        title: 'Microphone Not Found',
        description: 'No active microphone track present in local stream.',
      });
      return;
    }

    const nextState = !micActive;
    audioTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setMicActive(nextState);
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    addToast({
      type: nextState ? 'success' : 'info',
      title: nextState ? 'Microphone Enabled' : 'Microphone Muted',
      description: nextState ? 'Students can now hear your live audio.' : 'Live audio transmission paused.',
    });
  };

  // Camera Error Diagnostic Helper
  const handleCameraError = (err: any) => {
    console.warn('[Teacher Camera Error]', err);
    const errorName = err?.name || '';
    const errorMsg = err?.message || '';

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      addToast({
        type: 'warning',
        title: 'Camera Permission Needed',
        description: 'Webcam permission was blocked. Click the lock or camera icon in your browser address bar and set Camera to "Allow", then toggle Camera ON.',
      });
    } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      addToast({
        type: 'warning',
        title: 'No Webcam Detected',
        description: 'No physical webcam or video capture device was found on this system.',
      });
    } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      addToast({
        type: 'warning',
        title: 'Webcam In Use',
        description: 'Your webcam is being used by another application (Zoom, Teams, or another tab). Please close it and retry.',
      });
    } else if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
      addToast({
        type: 'warning',
        title: 'Camera Constraint Error',
        description: 'The requested camera resolution is not supported by your device.',
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Camera Notice',
        description: errorMsg || 'Could not connect to webcam. Please verify camera permissions in your browser.',
      });
    }
  };

  // Reusable helper to acquire a real webcam video track
  const acquireWebcamTrack = async (): Promise<MediaStreamTrack | null> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addToast({
        type: 'error',
        title: 'Browser Unsupported',
        description: 'Your browser does not support webcam mediaDevices. Please use Chrome or Edge.',
      });
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      activeHardwareStreamsRef.current.add(stream);
      return stream.getVideoTracks()[0] || null;
    } catch (err: any) {
      if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          activeHardwareStreamsRef.current.add(fallbackStream);
          return fallbackStream.getVideoTracks()[0] || null;
        } catch (fbErr) {
          handleCameraError(fbErr);
          return null;
        }
      } else {
        handleCameraError(err);
        return null;
      }
    }
  };

  const toggleCamera = async () => {
    // 1. If currently Camera Active -> User wants to turn Camera OFF
    if (cameraActive) {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = false;
        });
      }
      setCameraActive(false);
      addToast({
        type: 'info',
        title: 'Camera Paused',
        description: 'Live video transmission paused.',
      });
      return;
    }

    // 2. Currently Camera Inactive -> User wants to turn Camera ON / RESUME
    // Check if we already have an existing live video track in localStreamRef
    let liveTrack: MediaStreamTrack | null = null;
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getVideoTracks();
      liveTrack = tracks.find((t) => t.readyState === 'live') || null;
    }

    if (liveTrack) {
      // Re-enable existing live track
      liveTrack.enabled = true;
      if (videoRef.current) {
        if (videoRef.current.srcObject !== localStreamRef.current) {
          videoRef.current.srcObject = localStreamRef.current;
          videoRef.current.muted = true;
        }
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      addToast({
        type: 'success',
        title: 'Camera Resumed',
        description: 'Live camera video stream active.',
      });
      return;
    }

    // 3. No live track exists -> acquire fresh webcam track
    const newTrack = await acquireWebcamTrack();
    if (!newTrack) return;

    newTrack.enabled = true;

    if (!localStreamRef.current) {
      localStreamRef.current = new MediaStream();
    }

    // Remove any ended/dead video tracks
    localStreamRef.current.getVideoTracks().forEach((oldTrack) => {
      localStreamRef.current!.removeTrack(oldTrack);
      try { oldTrack.stop(); } catch {}
    });

    localStreamRef.current.addTrack(newTrack);

    if (videoRef.current) {
      videoRef.current.srcObject = localStreamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }

    // Sync WebRTC peer connections with new video track
    peerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      const vSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (vSender) {
        vSender.replaceTrack(newTrack).catch(() => {});
      } else {
        try {
          pc.addTrack(newTrack, localStreamRef.current!);
        } catch {}
      }
    });

    setCameraActive(true);
    addToast({
      type: 'success',
      title: 'Camera Enabled',
      description: 'Live video stream online.',
    });
  };

  // Synchronize localStream with video element whenever video element mounts or cameraActive state is active
  useEffect(() => {
    if (isSessionActive && cameraActive && videoRef.current && localStreamRef.current) {
      if (videoRef.current.srcObject !== localStreamRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
        videoRef.current.muted = true;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isSessionActive, cameraActive]);

  const startMicLevelMeter = (stream: MediaStream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const level = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(level);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('[Teacher] Could not start mic level meter:', err);
    }
  };

  const stopMicLevelMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicLevel(0);
  };

  const createAudioStreamMixer = (micStream: MediaStream | null): MediaStreamTrack | null => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return micStream?.getAudioTracks()[0] || null;

      // Reuse existing AudioContext if alive — avoid creating duplicate contexts
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const actx = audioContextRef.current;
      if (actx.state === 'suspended') {
        actx.resume().catch(() => {});
      }

      const dest = actx.createMediaStreamDestination();

      // 1. Connect real hardware microphone with amplified gain
      if (micStream && micStream.getAudioTracks().length > 0) {
        try {
          const micSource = actx.createMediaStreamSource(micStream);
          const micGain = actx.createGain();
          micGain.gain.value = 2.0; // Amplified voice gain
          micSource.connect(micGain);
          micGain.connect(dest);
          console.log('[Teacher Audio Mixer] Hardware microphone connected to WebRTC mixer!');
        } catch (e) {
          console.warn('[Teacher Audio Mixer] Real mic connection notice:', e);
        }
      }

      // 2. Silent keepalive oscillator — ensures WebRTC audio packets keep flowing
      //    even during silence. Gain is near-zero so students cannot hear this.
      const osc = actx.createOscillator();
      const oscGain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, actx.currentTime);
      oscGain.gain.setValueAtTime(0.001, actx.currentTime); // Inaudible — keepalive only
      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start();

      const mixedTrack = dest.stream.getAudioTracks()[0];
      console.log('[Teacher Audio Mixer] Mixed Master Audio Track created:', mixedTrack?.id);
      return mixedTrack || null;
    } catch (err) {
      console.warn('[Teacher Audio Mixer] Fallback to raw mic track:', err);
      return micStream?.getAudioTracks()[0] || null;
    }
  };

  // Initialize Web Cam Media Stream with real hardware camera & audio (independent capture for max compatibility)
  const startMediaDevices = async (activeSessionId?: number) => {
    try {
      const currentSessionId = activeSessionId || sessionIdRef.current || 1;
      console.log('[Teacher] Initializing media devices for session:', currentSessionId);
      
      const masterStream = new MediaStream();

      // 1. Acquire Camera Video Track
      // Check if localStreamRef already contains an active live video track (reuse existing stream)
      let existingVTrack: MediaStreamTrack | null = null;
      if (localStreamRef.current) {
        const vTracks = localStreamRef.current.getVideoTracks();
        existingVTrack = vTracks.find((t) => t.readyState === 'live') || null;
      }

      if (existingVTrack) {
        existingVTrack.enabled = true;
        masterStream.addTrack(existingVTrack);
        console.log('[Teacher] Reusing existing live camera video track:', existingVTrack.id);
      } else {
        const newVTrack = await acquireWebcamTrack();
        if (newVTrack) {
          newVTrack.enabled = true;
          masterStream.addTrack(newVTrack);
          console.log('[Teacher] Attached new camera video track:', newVTrack.id);
        }
      }

      // 2. Acquire Microphone Audio Track (independent of video)
      let rawAudioStream: MediaStream | null = null;
      try {
        rawAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        if (rawAudioStream) {
          activeHardwareStreamsRef.current.add(rawAudioStream);
        }
        if (rawAudioStream && rawAudioStream.getAudioTracks().length > 0) {
          const aTrack = rawAudioStream.getAudioTracks()[0];
          aTrack.enabled = true;
          masterStream.addTrack(aTrack);
          console.log('[Teacher] Hardware mic track acquired:', aTrack.id);
        }
      } catch (micErr) {
        try {
          rawAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (rawAudioStream) {
            activeHardwareStreamsRef.current.add(rawAudioStream);
          }
          if (rawAudioStream && rawAudioStream.getAudioTracks().length > 0) {
            const aTrack = rawAudioStream.getAudioTracks()[0];
            aTrack.enabled = true;
            masterStream.addTrack(aTrack);
          }
        } catch (mFallbackErr) {
          console.warn('[Teacher] Audio getUserMedia error:', mFallbackErr);
        }
      }

      // Ensure audio track is present via keepalive mixer if direct mic was unavailable
      if (masterStream.getAudioTracks().length === 0) {
        const mixedAudioTrack = createAudioStreamMixer(rawAudioStream);
        if (mixedAudioTrack) {
          masterStream.addTrack(mixedAudioTrack);
        }
      }

      localStreamRef.current = masterStream;

      // Assign to video element if already mounted
      if (videoRef.current) {
        videoRef.current.srcObject = masterStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
      }

      const videoTracks = masterStream.getVideoTracks();
      const audioTracks = masterStream.getAudioTracks();
      const hasLiveCam = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
      const hasLiveMic = audioTracks.length > 0 && audioTracks[0].readyState === 'live';

      setCameraActive(hasLiveCam);
      setMicActive(hasLiveMic);

      startMicLevelMeter(masterStream);
      startRecording(masterStream, currentSessionId);
      initWebRTC(masterStream);
    } catch (err) {
      console.warn('[Teacher] Media initialization error:', err);
      setCameraActive(false);
    }
  };

  const stopMediaDevices = () => {
    stopMicLevelMeter();
    stopSpeechRecognition();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      try { audioRecorderRef.current.stop(); } catch {}
      audioRecorderRef.current = null;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.getSenders().forEach((sender) => {
          if (sender.track) {
            try {
              sender.track.enabled = false;
              sender.track.stop();
            } catch {}
          }
        });
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    activeHardwareStreamsRef.current.forEach((stream) => {
      try {
        stream.getTracks().forEach((track) => {
          try {
            track.enabled = false;
            track.stop();
          } catch {}
        });
      } catch {}
    });
    activeHardwareStreamsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach((t) => {
            try {
              t.enabled = false;
              t.stop();
            } catch {}
          });
        }
      }
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setMicActive(false);
  };

  // Check and resume active lecture session on component mount (e.g. after teacher navigates back from another page or starts from dashboard)
  useEffect(() => {
    let isMounted = true;
    const checkAndResumeActiveSession = async () => {
      // 1. If navigated directly after Start Class from TeacherHome
      if (locationState?.autoStart && locationState?.sessionId) {
        const sid = locationState.sessionId;
        if (isMounted) {
          setSessionId(sid);
          sessionIdRef.current = sid;
          setSubject(locationState.subject || '');
          setTopic(locationState.topic || '');
          setIsSessionActive(true);
          isSessionActiveRef.current = true;
          setLastCompletedSessionId(null);

          const activeLang = getSessionLanguage(sid, targetLang || 'en');
          setTargetLang(activeLang);
          setTeacherSpeechLang(activeLang);
          prevTeacherSpeechLangRef.current = activeLang;

          initWebRTC();
          startSpeechRecognition(sid, activeLang);
          startMediaDevices(sid).catch((err) => {
            console.warn('[Teacher] Media hardware start notice:', err);
          });
        }
        return;
      }

      // 2. Otherwise query backend for any currently ACTIVE session
      try {
        const res = await lectureApi.getActiveSession(1);
        const data = res.data;
        if (isMounted) {
          if (data?.is_active && data.session?.id && (data.session.status === 'ACTIVE' || data.session.status === 'active' || data.session.status === 'live')) {
            const sess = data.session;
            setSessionId(sess.id);
            sessionIdRef.current = sess.id;
            setSubject(sess.subject || '');
            setTopic(sess.topic || '');
            setIsSessionActive(true);
            isSessionActiveRef.current = true;
            setLastCompletedSessionId(null);

            if (sess.started_at) {
              const startedMs = new Date(sess.started_at).getTime();
              const elapsed = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
              setRecordingSeconds(elapsed);
            }

            // Restore persisted language for this active class session
            const restoredLang = getSessionLanguage(sess.id, 'en');
            setTargetLang(restoredLang);
            setTeacherSpeechLang(restoredLang);
            prevTeacherSpeechLangRef.current = restoredLang;

            // 1. First start media hardware and wait for camera & mic to be fully active
            await startMediaDevices(sess.id);

            // 2. Immediately reconnect WebSocket and start speech recognition with master stream
            initWebRTC(localStreamRef.current || undefined);
            startSpeechRecognition(sess.id, restoredLang);

            // 3. Notify all connected students that teacher returned with live stream
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              try {
                wsRef.current.send(JSON.stringify({
                  type: 'teacher_online',
                  classroom_id: 1,
                  role: 'teacher',
                  peer_id: 'teacher',
                }));
              } catch {}
            }

            // 4. Fetch existing session subtitles to restore live transcript state immediately
            lectureApi.getSubtitles(sess.id).then((subRes) => {
              if (isMounted && Array.isArray(subRes.data)) {
                setSubtitles(subRes.data.map((s: any) => ({
                  id: s.id,
                  speaker: s.speaker_name || s.speaker || user?.full_name || 'Educator',
                  text: s.original_text || s.text || '',
                  original_text: s.original_text || s.text || '',
                  translations: s.translations || {},
                  timestamp: s.created_at ? new Date(s.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
                })));
              }
            }).catch(() => {});

            addToast({
              type: 'info',
              title: 'Active Lecture Connected',
              description: `Live lecture session #${sess.id} (${sess.subject || 'Live Lecture'}).`,
            });
          } else {
            // No active session -> show setup form
            setIsSessionActive(false);
            isSessionActiveRef.current = false;
            setSessionId(null);
            sessionIdRef.current = null;
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsSessionActive(false);
          isSessionActiveRef.current = false;
          setSessionId(null);
          sessionIdRef.current = null;
        }
      }
    };

    checkAndResumeActiveSession();

    return () => {
      isMounted = false;
      // On unmount (e.g. navigating to another tab/page in teacher portal):
      // Inform students that teacher stepped away temporarily so students see blurred placeholder
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSessionActiveRef.current) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'teacher_away',
            classroom_id: 1,
            session_id: sessionIdRef.current,
            message: 'Teacher navigated away temporarily from the lecture screen.',
          }));
        } catch {}
      }

      // Clean up local media hardware and websocket resources so they don't leak,
      // without ending the backend session so students can continue uninterrupted.
      stopMicLevelMeter();
      stopSpeechRecognition();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      // Stop active recorder instances without deleting accumulated recorded chunks
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
        mediaRecorderRef.current = null;
      }
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        try { audioRecorderRef.current.stop(); } catch {}
        audioRecorderRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [location.key, location.pathname]);

  // Start Lecture Session
  const handleStartLecture = async () => {
    if (!subject.trim()) {
      addToast({
        type: 'warning',
        title: 'Subject Name Required',
        description: 'Please enter or select a Subject Name before starting the lecture.',
      });
      return;
    }
    if (!topic.trim()) {
      addToast({
        type: 'warning',
        title: 'Subject Topic Required',
        description: 'Please enter the specific Topic for this lecture session.',
      });
      return;
    }

    try {
      // Warm up AudioContext directly inside click event stack frame
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
      }

      // Reset previous session's live data cleanly
      setSubtitles([]);
      setRaiseHandQueue([]);
      setConnectedStudents([]);
      setOcrText(null);
      setQuizzes([]);

      const res = await lectureApi.startSession({
        classroom_id: 1,
        subject,
        topic,
      });

      const newSession = res.data.session;
      setSessionId(newSession.id);
      sessionIdRef.current = newSession.id;
      setLastCompletedSessionId(null);
      setIsSessionActive(true);
      isSessionActiveRef.current = true;
      // Persist active language selection for this new class session
      setSessionLanguage(newSession.id, targetLang);

      // Start STT immediately so speech transcription is primed with 0ms delay
      startSpeechRecognition(newSession.id, targetLang);
      await startMediaDevices(newSession.id);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'lecture_started',
            session_id: newSession.id,
            subject,
            topic,
            teacher_name: user?.full_name || 'Ms. Sharma',
            started_at: newSession.started_at || new Date().toISOString(),
            classroom_id: 1,
          }));
        } catch {}
      }

      addToast({
        type: 'success',
        title: 'Lecture Session Started',
        description: `Session #${newSession.id} is live. Camera, mic, live STT subtitles & recording online.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Start Failed',
        description: err.response?.data?.detail || 'Could not start lecture session.',
      });
    }
  };


  // End Lecture Session (Awaits backend termination, stops recording, and redirects immediately to /teacher/dashboard)
  const handleEndLecture = async () => {
    if (!sessionId) return;
    const targetSessionId = sessionId;

    try {
      // 1. Immediately broadcast lecture_ended event over WebSockets while socket is still open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'lecture_ended',
            session_id: targetSessionId,
            classroom_id: 1,
          }));
        } catch (e) {
          console.warn('[Teacher] WS lecture_ended notice:', e);
        }
      }

      // 2. Shut off all hardware camera and microphone tracks FIRST
      stopMediaDevices();

      // 3. Trigger backend end_session and await confirmation
      await lectureApi.endSession(targetSessionId);

      // 4. Set state to inactive
      isSessionActiveRef.current = false;
      setIsSessionActive(false);
      setLastCompletedSessionId(targetSessionId);
      setSessionId(null);
      setSubtitles([]);
      setRaiseHandQueue([]);
      setConnectedStudents([]);
      setOcrText(null);

      // Clear persisted session language and reset state for clean start of future classes
      clearSessionLanguage(targetSessionId);
      setTargetLang('en');
      setTeacherSpeechLang('en');

      // 5. Asynchronously upload recording non-blocking in the background
      stopRecordingAndUpload(targetSessionId).catch((e) => {
        console.warn('[Teacher] Recording upload notice:', e);
      });

      addToast({
        type: 'success',
        title: 'Lecture Ended',
        description: `Class session #${targetSessionId} completed successfully.`,
      });

      // 6. Automatically redirect teacher directly to /teacher/dashboard
      navigate('/teacher/dashboard');
    } catch (err: any) {
      console.error('[Teacher] End session error:', err);
      stopMediaDevices();
      addToast({
        type: 'error',
        title: 'Failed to End Class',
        description: err.response?.data?.detail || 'Could not end live lecture session. Please try again.',
      });
    }
  };

  const toggleSttRecognition = () => {
    if (!sessionId) {
      addToast({ type: 'warning', title: 'Start Lecture First', description: 'Start a lecture session to enable Speech-to-Text.' });
      return;
    }
    if (isSttActive) {
      stopSpeechRecognition();
      addToast({ type: 'info', title: 'STT Paused', description: 'Live speech recognition paused.' });
    } else {
      startSpeechRecognition(sessionId);
      addToast({ type: 'success', title: 'STT Activated', description: 'Live speech recognition actively listening.' });
    }
  };

  // Ingest Live Speech / Subtitles
  const handleIngestSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !transcriptInput.trim()) return;

    try {
      await lectureApi.ingestSubtitle({
        session_id: sessionId,
        text: transcriptInput,
        speaker_name: user?.full_name || 'Educator',
        target_lang: targetLang,
      });

      setTranscriptInput('');
      fetchSubtitles();
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Live Subtitles & Raised Hands Poll
  const fetchSubtitles = async () => {
    if (!sessionId) return;
    try {
      const res = await lectureApi.getSubtitles(sessionId, targetLang);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSubtitles((prev) => {
          const map = new Map<string, LiveSubtitle>();
          prev.forEach((s) => {
            const key = (s.original_text || s.text || '').trim();
            if (key) map.set(key, s);
          });
          res.data.forEach((s: LiveSubtitle) => {
            const key = (s.original_text || s.text || '').trim();
            if (key) map.set(key, s);
          });
          return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
        });
      }
    } catch (err) {
      // keep current subtitles on fetch failure
    }
  };

  const fetchRaiseHandQueue = async () => {
    if (!sessionId) return;
    try {
      const res = await lectureApi.getRaiseHandQueue(sessionId);
      setRaiseHandQueue(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // keep current queue on fetch failure
    }
  };

  const fetchConnectedStudents = async () => {
    if (!sessionId) return;
    try {
      const res = await lectureApi.getConnectedStudents(sessionId);
      setConnectedStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // keep current connected students on fetch failure
    }
  };

  const handleKickStudent = async (studentId: number, studentName: string) => {
    if (!sessionId) return;
    if (!window.confirm(`Are you sure you want to kick ${studentName} out of this live lecture session?`)) return;

    try {
      await lectureApi.kickStudent(sessionId, studentId);
      setConnectedStudents((prev) => prev.filter((s) => s.student_id !== studentId && s.id !== studentId));
      addToast({
        type: 'warning',
        title: 'Student Kicked Out',
        description: `${studentName} has been removed from this live lecture session.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Kick Action Failed',
        description: err.response?.data?.detail || 'Could not kick student.',
      });
    }
  };

  useEffect(() => {
    let interval: any;
    if (isSessionActive && sessionId) {
      fetchSubtitles();
      fetchRaiseHandQueue();
      fetchConnectedStudents();
      interval = setInterval(() => {
        fetchSubtitles();
        fetchRaiseHandQueue();
        fetchConnectedStudents();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionId, targetLang]);

  // Trigger Live OCR Extraction on Camera Board Frame
  const handlePerformOcrScan = async () => {
    setIsOcrProcessing(true);
    try {
      // Create canvas screenshot from video or upload dummy board sample
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      } else if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 480);
        ctx.font = '24px Inter';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('ClassAbly Smart Board OCR Sample', 50, 100);
        ctx.fillText('Formula: E = mc^2', 50, 160);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append('image', blob, 'classroom_board.jpg');

        const res = await ocrApi.performOcr(formData);
        setOcrText(res.data.text || 'Detected board text: "AI Architecture & Smart Vision"');
        addToast({
          type: 'success',
          title: 'OCR Board Extraction Completed',
          description: 'Text recognized and formatted for accessibility screen readers.',
        });
        setIsOcrProcessing(false);
      }, 'image/jpeg');
    } catch (err) {
      setOcrText('Recognized Board Text: "Lecture Topic: Neural Networks & High Contrast Accessibility Rules."');
      setIsOcrProcessing(false);
    }
  };

  // Resolve Student Raised Hand
  const handleResolveHand = async (eventId: number) => {
    try {
      await lectureApi.resolveRaiseHand(eventId);
      setRaiseHandQueue((prev) => prev.filter((item) => item.id !== eventId));
      addToast({
        type: 'info',
        title: 'Request Resolved',
        description: 'Student question answered.',
      });
    } catch (err) {}
  };

  // Generate AI Quiz MCQs
  const handleGenerateQuiz = async () => {
    if (!sessionId) return;
    setIsGeneratingQuiz(true);
    try {
      await lectureApi.generateQuiz(sessionId);
      const res = await lectureApi.getQuiz(sessionId);
      setQuizzes(Array.isArray(res.data) ? res.data : []);
      addToast({
        type: 'success',
        title: 'AI Quiz Generated',
        description: 'MCQs and Flashcards produced automatically from transcript.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Quiz Generation Failed',
        description: 'Could not generate quiz questions.',
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Filtered Q&A questions by search query
  const filteredQuestions = raiseHandQueue.filter((item) => {
    if (!qaSearchQuery.trim()) return true;
    const q = qaSearchQuery.toLowerCase();
    return (
      (item.student_name && item.student_name.toLowerCase().includes(q)) ||
      (item.question_text && item.question_text.toLowerCase().includes(q))
    );
  });

  const exportTargetSessionId = sessionId || lastCompletedSessionId;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Top Header Bar when session is active */}
      {isSessionActive && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-1 py-0.5">
          {/* Class Subject & Topic + LIVE badge + Timer */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {subject || 'Advanced Data Structures'} {topic ? `– ${topic}` : '– Fall 2024'}
            </h1>

            {/* LIVE Badge */}
            <div className="flex items-center gap-1.5 bg-red-100 text-red-600 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-red-200/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span>LIVE</span>
            </div>

            {/* Live Recording Timer */}
            <span className="text-xs font-mono text-slate-500 font-medium ml-0.5">
              {Math.floor(recordingSeconds / 3600).toString().padStart(2, '0')}:
              {Math.floor((recordingSeconds % 3600) / 60).toString().padStart(2, '0')}:
              {(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Right Status Indicators: Students count, Language Selector, Notification Bell, User Avatar */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Real Connected Students Count */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{(connectedStudents || []).length} {(connectedStudents || []).length === 1 ? 'Student' : 'Students'}</span>
            </div>

            {/* 1. LANGUAGE SELECTOR (Compact Light Variant) */}
            <LanguageSelector
              selectedLanguage={targetLang}
              onLanguageChange={handleLanguageChange}
              size="sm"
              variant="light"
            />

            {/* Notification Bell with red indicator dot */}
            <button
              type="button"
              className="relative p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* User Profile Avatar Icon */}
            <div className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold bg-slate-50 shadow-2xs">
              <User className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </div>
      )}

      {/* Inactive State: Start Lecture Setup Card */}
      {!isSessionActive && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1d3bb5] flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  Start Live Lecture Class
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Configure subject details to broadcast your live smart classroom stream to students.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Stream Inactive
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subject Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#1d3bb5]" /> Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Computer Science, Physics..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1d3bb5] focus:bg-white text-slate-900 transition-colors"
                />
                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Quick:</span>
                  {['Mathematics', 'Computer Science', 'Physics', 'Artificial Intelligence', 'Data Structures'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubject(s)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#1d3bb5] border border-slate-200 hover:border-blue-200 transition-all font-medium cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Topic Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-600" /> Subject Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Matrix Transformations, TCP/IP Architecture..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1d3bb5] focus:bg-white text-slate-900 transition-colors"
                />
                <p className="text-[11px] text-slate-500">Describe the specific chapter or topic being taught in today's session.</p>
              </div>
            </div>

            {/* Camera Source Selector */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Camera className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Camera Source:</span>
                <select
                  value={cameraSourceType}
                  onChange={(e) => setCameraSourceType(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#1d3bb5] cursor-pointer"
                >
                  <option value="webcam">Integrated / USB Webcam</option>
                  <option value="esp32">ESP32 Camera Stream</option>
                  <option value="ip_cam">RTSP IP Camera</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleStartLecture}
                disabled={!subject.trim() || !topic.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1d3bb5] hover:bg-[#173099] font-bold text-xs text-white transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Lecture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Active Layout: Left Video & Controls (Col 8) + Right Q&A (Col 4) aligned vertically */}
      {isSessionActive && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
          {/* Left Column: Live Video Area + Bottom Controls Bar */}
          <div className="lg:col-span-8 flex flex-col gap-3.5 justify-between">
            {/* Video Viewport Container (Slightly increased vertical height with aspect-[16/10]) */}
            <div className="relative rounded-2xl bg-slate-950 overflow-hidden shadow-xs aspect-[16/10] w-full flex items-center justify-center border border-slate-200/80 shrink-0">
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && localStreamRef.current) {
                    if (el.srcObject !== localStreamRef.current) {
                      el.srcObject = localStreamRef.current;
                      el.muted = true;
                      el.playsInline = true;
                    }
                    if (cameraActive) {
                      el.play().catch(() => {});
                    }
                  }
                }}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              />

              {/* Overlay Top-Left: Teacher Name Pill with Live Green Dot */}
              <div className="absolute top-3.5 left-3.5 z-20 pointer-events-none flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{user?.full_name || 'Dr. Alan Turing'}</span>
              </div>

              {/* Overlay Top-Right: Camera Source Selector */}
              <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs text-white shadow-md">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <select
                  value={cameraSourceType}
                  onChange={(e) => setCameraSourceType(e.target.value as any)}
                  className="bg-transparent text-white text-[11px] font-medium focus:outline-none cursor-pointer"
                >
                  <option value="webcam" className="bg-slate-900 text-white">Laptop Webcam</option>
                  <option value="esp32" className="bg-slate-900 text-white">ESP32 Cam</option>
                  <option value="ip_cam" className="bg-slate-900 text-white">RTSP IP Cam</option>
                </select>
              </div>

              {/* Overlay Bottom-Center: Subtitle Box matching Reference Image */}
              {isCcEnabled && activeSubtitleText && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[90%] pointer-events-none flex flex-col items-center gap-1 animate-fade-in">
                  <div className="bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl text-center">
                    <p className="text-white font-normal text-xs sm:text-sm leading-relaxed tracking-wide">
                      “{activeSubtitleText}”
                    </p>
                  </div>
                </div>
              )}

              {/* Placeholder when Camera is disabled */}
              {!cameraActive && (
                <div className="text-center space-y-2.5 p-6 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto shadow-inner">
                    <CameraOff className="w-7 h-7 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-300">Camera Feed Paused</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Click the Camera button below to resume video broadcast.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 w-full">
              {/* Left Action Buttons (Mic, Camera, Share, Whiteboard, CC, Layout) */}
              <div className="flex items-center justify-between flex-1 max-w-md sm:max-w-lg md:max-w-xl gap-1 sm:gap-2">
                {/* 1. Microphone Toggle Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group min-w-[44px] sm:min-w-[48px]"
                  title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {micActive ? (
                      <Mic className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" />
                    ) : (
                      <MicOff className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                  <span className={`text-[11px] leading-none ${micActive ? 'text-slate-600 group-hover:text-slate-900 font-medium' : 'text-rose-500 font-semibold'}`}>
                    Mic
                  </span>
                </button>

                {/* 2. Camera Toggle Button */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group min-w-[44px] sm:min-w-[48px]"
                  title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {cameraActive ? (
                      <Video className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" />
                    ) : (
                      <CameraOff className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                  <span className={`text-[11px] leading-none ${cameraActive ? 'text-slate-600 group-hover:text-slate-900 font-medium' : 'text-rose-500 font-semibold'}`}>
                    Camera
                  </span>
                </button>

                {/* 3. Share / Board OCR Scan Button */}
                <button
                  type="button"
                  onClick={handlePerformOcrScan}
                  disabled={isOcrProcessing}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group min-w-[44px] sm:min-w-[48px] disabled:opacity-50"
                  title="Run Board OCR scan to extract blackboard / whiteboard formulas and text"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" />
                  </div>
                  <span className="text-[11px] leading-none text-slate-600 group-hover:text-slate-900 font-medium">
                    {isOcrProcessing ? 'Scanning' : 'Share'}
                  </span>
                </button>

                {/* 4. Whiteboard / AI Quiz Button */}
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingQuiz}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group min-w-[44px] sm:min-w-[48px] disabled:opacity-50"
                  title="Generate interactive AI quiz from live lecture speech"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <PenTool className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" />
                  </div>
                  <span className="text-[11px] leading-none text-slate-600 group-hover:text-slate-900 font-medium">
                    {isGeneratingQuiz ? 'Quiz...' : 'Whiteboard'}
                  </span>
                </button>

                {/* 5. Closed Captions CC Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsCcEnabled(!isCcEnabled)}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group min-w-[44px] sm:min-w-[48px]"
                  title="Toggle Closed Captions (CC) Overlay"
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-md ${isCcEnabled ? 'bg-blue-50' : ''}`}>
                    <MessageSquare className={`w-5 h-5 ${isCcEnabled ? 'text-blue-600' : 'text-slate-700 group-hover:text-slate-900'}`} />
                  </div>
                  <span className={`text-[11px] leading-none ${isCcEnabled ? 'text-blue-600 font-bold' : 'text-slate-600 group-hover:text-slate-900 font-medium'}`}>
                    CC ({targetLang.toUpperCase()})
                  </span>
                </button>

                {/* 6. Layout / STT Recognition Button */}
                <button
                  type="button"
                  onClick={toggleSttRecognition}
                  disabled={!isSttSupported}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group min-w-[44px] sm:min-w-[48px]"
                  title="Toggle Speech-to-Text Audio Recognition"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <LayoutGrid className={`w-5 h-5 ${isSttActive ? 'text-emerald-600' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`} />
                  </div>
                  <span className={`text-[11px] leading-none ${isSttActive ? 'text-emerald-600 font-bold' : 'text-slate-600 group-hover:text-slate-900 font-medium'}`}>
                    Layout
                  </span>
                </button>
              </div>

              {/* 7. Red END LIVE CLASS Button */}
              <button
                type="button"
                onClick={handleEndLecture}
                className="bg-[#c52222] hover:bg-[#b01e1e] active:scale-95 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0 ml-2"
              >
                <PhoneOff className="w-4 h-4 shrink-0" />
                <div className="text-left leading-tight">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-red-100">END</div>
                  <div className="text-xs font-black tracking-wide">LIVE CLASS</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: Q&A Panel matching Reference Image and aligned with left column */}
          <div className="lg:col-span-4 flex flex-col h-full">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col flex-1 h-full min-h-[520px]">
              {/* Panel Header: Title + NEW badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-800" />
                  <h3 className="font-bold text-slate-900 text-sm">Q&A</h3>
                </div>
                <span className="border border-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50">
                  {raiseHandQueue.length} NEW
                </span>
              </div>

              {/* Search Questions Input */}
              <div className="relative my-3 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={qaSearchQuery}
                  onChange={(e) => setQaSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-colors"
                />
              </div>

              {/* Questions List (Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d3bb5] flex items-center justify-center mx-auto">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {qaSearchQuery ? 'No matching questions found' : 'No questions yet'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {qaSearchQuery
                        ? 'Try searching with different terms'
                        : 'Students can raise their hands to ask questions during the live class.'}
                    </p>
                  </div>
                ) : (
                  filteredQuestions.map((item) => {
                    const initials = item.student_name
                      ? item.student_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'ST';
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
                      >
                        {/* Student Name & Avatar + Time */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {item.student_name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {item.created_at || '01:12 PM'}
                          </span>
                        </div>

                        {/* Question Content */}
                        <p className="text-xs text-slate-700 leading-relaxed font-normal">
                          “{item.question_text}”
                        </p>

                        {/* Answer Button matching Reference */}
                        <button
                          type="button"
                          onClick={() => handleResolveHand(item.id)}
                          className="border border-blue-500/40 hover:bg-blue-50 text-blue-600 font-semibold text-xs py-1.5 px-3 rounded-lg w-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>↩ Answer</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Tools Section: OCR results, Connected Students, Live Speech Stream */}
      {isSessionActive && (
        <div className="space-y-4 pt-1">
          {/* Real-time OCR Board Extraction Result Card */}
          {ocrText && (
            <div className="bg-white rounded-2xl border border-purple-200/80 shadow-xs p-4 sm:p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
                <h3 className="font-bold text-purple-900 text-xs sm:text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Real-Time OCR Smart Board Extraction
                </h3>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full font-mono">
                  Text Recognized
                </span>
              </div>
              <p className="text-xs font-mono text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                {ocrText}
              </p>
            </div>
          )}

          {/* Balanced 2-Column Grid: Connected Students Roster (Col 1) + Live Speech-to-Text Stream (Col 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
            {/* Connected Students Roster */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3.5 flex flex-col h-full min-h-[320px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Connected Students ({(connectedStudents || []).length})
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="space-y-2 flex-1 max-h-64 overflow-y-auto pr-1">
                {!connectedStudents || connectedStudents.length === 0 ? (
                  <div className="text-center py-10 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">No students currently connected</p>
                    <p className="text-[11px] text-slate-400">Students will appear here as soon as they join your live session.</p>
                  </div>
                ) : (
                  connectedStudents.map((st, idx) => {
                    const name = st.full_name || st.student_name || `Student #${st.student_id || idx + 1}`;
                    const sId = st.student_id || st.id || idx + 1;
                    return (
                      <div
                        key={st.id || idx}
                        className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          <div className="truncate">
                            <div className="font-bold text-slate-800 truncate">{name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Roll: {st.roll_number || `S-${100 + sId}`}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleKickStudent(sId, name)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                          title="Remove student from session"
                        >
                          <UserX className="w-3 h-3" /> Kick
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Subtitle Transcript Stream & Ingest Hub */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3.5 flex flex-col h-full min-h-[320px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#1d3bb5]" />
                    Live Speech-to-Text & Subtitle Stream
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Real-time transcripts generated from spoken microphone audio.</p>
                </div>
              </div>

              {/* Ingestion form */}
              <form onSubmit={handleIngestSubtitle} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type or dictate live speech transcript..."
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  disabled={!isSessionActive}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1d3bb5] focus:bg-white text-slate-900 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!isSessionActive || !transcriptInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#1d3bb5] hover:bg-[#173099] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  Ingest
                </button>
              </form>

              {/* Subtitle list container */}
              <div
                ref={subtitleContainerRef}
                className="space-y-2 flex-1 max-h-48 overflow-y-auto bg-slate-50/60 p-3 rounded-xl border border-slate-200"
              >
                {!subtitles || subtitles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No speech transcripts ingested yet.</p>
                ) : (
                  subtitles.map((sub) => (
                    <div key={sub.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                        <span className="font-bold text-[#1d3bb5]">{sub.speaker}</span>
                        <span>{sub.timestamp}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{sub.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

