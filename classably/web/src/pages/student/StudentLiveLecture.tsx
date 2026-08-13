import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Video, VideoOff, HelpCircle, Volume2, VolumeX, Globe, Sparkles, Download, CheckCircle2,
  RefreshCw, Mic, MessageSquare, Send, BookOpen, X, ChevronDown, ChevronUp,
  Loader2, FileText, Brain, Hand, School, Radio, UserCheck, Clock, Shield
} from 'lucide-react';
import { lectureApi, exportApi, aiQaApi, adminApi, academicsApi } from '../../api/client';
import { LiveSubtitle, AIQAMessage, AILectureSummary, User, TimetableItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { translateClientText } from '../../utils/clientTranslation';

export const StudentLiveLecture: React.FC = () => {
  const { addToast } = useToast();
  const { speakText } = useAccessibility();
  const { user } = useAuth();

  const studentId = user?.id || 1;
  const [classroomId, setClassroomId] = useState<number>(user?.classroom_id || 1);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Teacher');
  const [sessionSubject, setSessionSubject] = useState<string>('');
  const [sessionTopic, setSessionTopic] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<'ACTIVE' | 'ENDED' | 'OFFLINE'>('OFFLINE');

  // Multi-session & Educator directory state
  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([]);
  const [onlineTeachers, setOnlineTeachers] = useState<any[]>([]);
  const [scheduledTimetable, setScheduledTimetable] = useState<TimetableItem[]>([]);

  const aiInputRef = useRef<HTMLInputElement | null>(null);
  const downloadsRef = useRef<HTMLDivElement | null>(null);
  const [subtitles, setSubtitles] = useState<LiveSubtitle[]>([]);
  const [targetLang, setTargetLang] = useState('en');
  const [isCcEnabled, setIsCcEnabled] = useState(true);
  const targetLangRef = useRef(targetLang);

  // Subtitle display settings
  const [subtitleSize, setSubtitleSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [subtitlePosition, setSubtitlePosition] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  // Raise Hand State
  const [questionText, setQuestionText] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [questionCategory, setQuestionCategory] = useState('doubt');

  // AI Q&A State
  const [aiMessages, setAiMessages] = useState<AIQAMessage[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(true);
  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

  // Summary State
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<AILectureSummary | null>(null);
  const [summaryStyle, setSummaryStyle] = useState('detailed');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Media State
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [autoReadSubtitles, setAutoReadSubtitles] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const lastSpokenSubIdRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const subtitleContainerRef = useRef<HTMLDivElement | null>(null);

  const peerIdRef = useRef<string>(
    `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  useEffect(() => {
    if (subtitleContainerRef.current) {
      subtitleContainerRef.current.scrollTop = subtitleContainerRef.current.scrollHeight;
    }
  }, [subtitles]);

  // Auto-scroll AI chat
  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages]);

  // ─── Subtitle Auto-Read ──────────────────────────────────────────────────
  useEffect(() => {
    if (autoReadSubtitles && subtitles.length > 0) {
      const latestSub = subtitles[subtitles.length - 1];
      if (latestSub && latestSub.id !== lastSpokenSubIdRef.current) {
        lastSpokenSubIdRef.current = latestSub.id;
        speakText(latestSub.text);
      }
    }
  }, [subtitles, autoReadSubtitles, speakText]);

  // ─── Attach Remote Stream to Media Elements ──────────────────────────────
  const attachStreamToElements = useCallback((stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (videoRef.current && videoTracks.length > 0) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }

    if (audioRef.current && audioTracks.length > 0) {
      audioRef.current.srcObject = stream;
      audioRef.current.muted = true;
      audioRef.current.play().catch(() => {});
    }

    if (videoTracks.length > 0) setHasVideo(true);
    if (audioTracks.length > 0) setHasAudio(true);
  }, []);

  // ─── Unmute ───────────────────────────────────────────────────────────────
  const handleUnmute = useCallback(async () => {
    setIsAudioMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = audioVolume;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = audioVolume;
      await audioRef.current.play().catch(() => {});
    }
    addToast({ type: 'success', title: 'Teacher Audio Active', description: 'Voice audio unmuted.' });
  }, [audioVolume, addToast]);

  const toggleAudioMute = useCallback(async () => {
    if (isAudioMuted) {
      await handleUnmute();
    } else {
      setIsAudioMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
      if (audioRef.current) audioRef.current.muted = true;
      addToast({ type: 'info', title: 'Audio Muted', description: 'Teacher audio muted.' });
    }
  }, [isAudioMuted, handleUnmute, addToast]);

  const handleVolumeChange = (newVol: number) => {
    setAudioVolume(newVol);
    if (videoRef.current) videoRef.current.volume = newVol;
    if (audioRef.current) audioRef.current.volume = newVol;
    if (newVol > 0 && isAudioMuted) handleUnmute();
  };

  // ─── WebRTC Signaling ────────────────────────────────────────────────────
  const initWebRTC = useCallback(() => {
    if (!isMountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/events/${classroomId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    ws.onopen = () => {
      setConnectionState('connected');
      ws.send(JSON.stringify({
        type: 'join', role: 'student', classroom_id: classroomId, peer_id: peerIdRef.current,
      }));
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current,
          }));
        }
      }, 500);
    };

    ws.onclose = () => {
      if (isMountedRef.current) {
        setConnectionState('reconnecting');
        reconnectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) initWebRTC();
        }, 3000);
      }
    };

    ws.onerror = () => {};

    ws.onmessage = async (event) => {
      if (!isMountedRef.current) return;
      try {
        const message = JSON.parse(event.data);

        // Handle kick message
        if (message.type === 'student_kicked' && message.peer_id === peerIdRef.current) {
          addToast({
            type: 'error',
            title: 'Removed from Session',
            description: message.message || 'You have been removed from this lecture by the teacher.',
          });
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
          setConnectionState('disconnected');
          setHasVideo(false);
          setHasAudio(false);
          return;
        }

        // Handle session ended or teacher offline events
        if (message.type === 'lecture_ended' || message.type === 'session_ended') {
          setSessionStatus('ENDED');
          setConnectionState('disconnected');
          setHasVideo(false);
          setHasAudio(false);
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          addToast({
            type: 'info',
            title: 'Live Class Has Ended',
            description: 'The teacher has ended this lecture session.',
          });
          return;
        }

        if (message.type === 'teacher_offline') {
          setSessionStatus('OFFLINE');
          setConnectionState('disconnected');
          setHasVideo(false);
          setHasAudio(false);
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          return;
        }

        if (message.type === 'teacher_online') {
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current,
              }));
            }
          }, 300);
          return;
        }

        if (message.type === 'subtitle' && message.subtitle) {
          const sub = message.subtitle;
          const currentLang = targetLangRef.current;
          let displayText = sub.text || sub.original_text;
          if (currentLang && currentLang !== 'en') {
            if (sub.translations && sub.translations[currentLang]) {
              displayText = sub.translations[currentLang];
            } else if (sub.translated_text && sub.language === currentLang) {
              displayText = sub.translated_text;
            } else {
              displayText = translateClientText(sub.original_text || sub.text, currentLang);
            }
          }
          const newSub: LiveSubtitle = {
            id: sub.id || Date.now(),
            speaker: sub.speaker || 'Teacher',
            text: displayText,
            original_text: sub.original_text || sub.text,
            translated_text: sub.translated_text,
            translations: sub.translations,
            timestamp: sub.timestamp || new Date().toLocaleTimeString(),
          };
          setSubtitles((prev) => {
            if (prev.some((s) => s.id === newSub.id)) return prev;
            return [...prev, newSub];
          });
          return;
        }

        if (message.target_id && message.target_id !== peerIdRef.current && message.target_id !== 'all') return;

        if (message.type === 'offer' && message.sdp) {
          if (pcRef.current) {
            pcRef.current.ontrack = null;
            pcRef.current.onicecandidate = null;
            pcRef.current.onconnectionstatechange = null;
            pcRef.current.close();
            pcRef.current = null;
          }

          const pc = new RTCPeerConnection(rtcConfig);
          pcRef.current = pc;
          pendingCandidatesRef.current = [];
          remoteStreamRef.current = new MediaStream();

          let attachTimer: ReturnType<typeof setTimeout> | null = null;

          pc.ontrack = (trackEvent) => {
            let stream: MediaStream;
            if (trackEvent.streams && trackEvent.streams[0]) {
              stream = trackEvent.streams[0];
              remoteStreamRef.current = stream;
            } else {
              if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
              stream = remoteStreamRef.current;
              if (!stream.getTracks().some((t) => t.id === trackEvent.track.id)) {
                stream.addTrack(trackEvent.track);
              }
            }
            if (trackEvent.track.kind === 'video') setHasVideo(true);
            if (trackEvent.track.kind === 'audio') setHasAudio(true);
            if (attachTimer) clearTimeout(attachTimer);
            attachTimer = setTimeout(() => {
              if (remoteStreamRef.current) attachStreamToElements(remoteStreamRef.current);
            }, 100);
          };

          pc.onicecandidate = (iceEvent) => {
            if (iceEvent.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'candidate', candidate: iceEvent.candidate,
                classroom_id: classroomId, peer_id: peerIdRef.current, target_id: 'teacher',
              }));
            }
          };

          pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);

          pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') pc.restartIce();
          };

          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));

          if (pendingCandidatesRef.current.length > 0) {
            for (const cand of pendingCandidatesRef.current) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
            }
            pendingCandidatesRef.current = [];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'answer', sdp: answer,
              classroom_id: classroomId, peer_id: peerIdRef.current, target_id: 'teacher',
            }));
          }
        } else if (message.type === 'candidate' && message.candidate) {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription?.type) {
            try { await pc.addIceCandidate(new RTCIceCandidate(message.candidate)); } catch {}
          } else {
            pendingCandidatesRef.current.push(message.candidate);
          }
        }
      } catch {}
    };

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const state = pcRef.current?.connectionState;
        if (!state || state === 'failed' || state === 'disconnected' || state === 'new') {
          ws.send(JSON.stringify({
            type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current,
          }));
        }
      }
    }, 8000);
  }, [classroomId, attachStreamToElements, addToast]);

  // ─── Session Discovery & Multi-Classroom Stream Fetching ─────────────────
  useEffect(() => {
    const fetchActiveSessions = async () => {
      try {
        const [allActiveRes, teacherRes, ttRes] = await Promise.allSettled([
          lectureApi.getAllActiveSessions(),
          lectureApi.getTeachers(),
          academicsApi.getTodayTimetable(),
        ]);

        if (teacherRes.status === 'fulfilled' && Array.isArray(teacherRes.value.data)) {
          setOnlineTeachers(teacherRes.value.data);
        }
        if (ttRes.status === 'fulfilled' && Array.isArray(ttRes.value.data)) {
          setScheduledTimetable(ttRes.value.data);
        }

        if (allActiveRes.status === 'fulfilled' && allActiveRes.value.data?.active_sessions) {
          const sessions: any[] = allActiveRes.value.data.active_sessions;
          setActiveSessionsList(sessions);

          if (sessions.length > 0) {
            setSessionId((prevId) => {
              const selected = sessions.find((s) => s.id === prevId) || sessions[0];
              setTeacherName(selected.teacher_name || 'Faculty Educator');
              setSessionSubject(selected.subject || '');
              setSessionTopic(selected.topic || '');
              setSessionStatus('ACTIVE');
              return selected.id;
            });
            return;
          }
        }

        // Fallback: check classroom specific active session
        const res = await lectureApi.getActiveSession(classroomId);
        const data = res.data;
        if (data?.session?.id) {
          setSessionId(data.session.id);
          setTeacherName(data.session.teacher_name || 'Faculty Educator');
          setSessionSubject(data.session.subject || '');
          setSessionTopic(data.session.topic || '');
          const rawStatus = (data.session.status || 'ACTIVE').toUpperCase();
          setSessionStatus(data.is_active === false || rawStatus === 'ENDED' || rawStatus === 'COMPLETED' ? 'ENDED' : 'ACTIVE');
        } else {
          setSessionStatus('OFFLINE');
        }
      } catch {
        setSessionStatus('OFFLINE');
      }
    };

    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 3000);
    return () => clearInterval(interval);
  }, [classroomId]);

  // ─── Register connection ─────────────────────────────────────────────────
  useEffect(() => {
    if (sessionId) {
      lectureApi.connectStudent({ session_id: sessionId, peer_id: peerIdRef.current }).catch(() => {});
    }
    return () => {
      if (sessionId) {
        lectureApi.disconnectStudent({ session_id: sessionId }).catch(() => {});
      }
    };
  }, [sessionId]);

  // ─── Init WebRTC on mount ─────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    initWebRTC();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Subtitle Polling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || sessionStatus !== 'ACTIVE') {
      setSubtitles([]);
      return;
    }
    const fetchSubs = async () => {
      try {
        const res = await lectureApi.getSubtitles(sessionId, targetLang);
        if (isMountedRef.current && Array.isArray(res.data)) {
          const formatted = res.data.map((s: any) => {
            let displayText = s.text;
            if (targetLang !== 'en' && s.original_text && s.text === s.original_text) {
              displayText = translateClientText(s.original_text, targetLang);
            }
            return { ...s, text: displayText };
          });
          setSubtitles((prev) => {
            if (formatted.length === 0) return [];
            const map = new Map<number, LiveSubtitle>();
            prev.forEach((s) => map.set(s.id, s));
            formatted.forEach((s: LiveSubtitle) => map.set(s.id, s));
            return Array.from(map.values());
          });
        }
      } catch {}
    };
    fetchSubs();
    const interval = setInterval(fetchSubs, 400);
    return () => clearInterval(interval);
  }, [sessionId, sessionStatus, targetLang, teacherName]);

  // ─── Load AI Q&A history ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    aiQaApi.getQAHistory(sessionId).then((res) => {
      setAiMessages(res.data || []);
    }).catch(() => {});
  }, [sessionId]);

  // ─── AI Q&A ───────────────────────────────────────────────────────────────
  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !sessionId || isAiLoading) return;

    const question = aiQuestion.trim();
    setAiQuestion('');
    setIsAiLoading(true);

    // Optimistically add user message
    const tempId = Date.now();
    setAiMessages((prev) => [...prev, {
      id: tempId, student_id: studentId, question, answer: '', created_at: new Date().toLocaleTimeString(),
    }]);

    try {
      const res = await aiQaApi.askQuestion({ session_id: sessionId, question });
      const msg = res.data.message;
      setAiMessages((prev) => prev.map((m) =>
        m.id === tempId ? { ...m, id: msg.id, answer: msg.answer, created_at: msg.created_at } : m
      ));
    } catch {
      setAiMessages((prev) => prev.map((m) =>
        m.id === tempId ? { ...m, answer: 'Sorry, something went wrong. Please try again.' } : m
      ));
      addToast({ type: 'error', title: 'AI Error', description: 'Could not get AI response.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  // ─── Summarize ────────────────────────────────────────────────────────────
  const handleSummarize = async () => {
    if (!sessionId || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const res = await aiQaApi.summarizeLecture(sessionId, summaryStyle);
      setSummaryData(res.data.summary);
      setShowSummary(true);
      addToast({ type: 'success', title: 'Summary Generated', description: 'AI lecture summary is ready.' });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Summary Failed',
        description: err?.response?.data?.detail || 'Could not generate summary.',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  // ─── Raise Hand ───────────────────────────────────────────────────────────
  const handleRaiseHand = async () => {
    try {
      const fullQuestion = questionCategory !== 'other'
        ? `[${questionCategory.toUpperCase()}] ${questionText || 'Student needs assistance.'}`
        : questionText || 'Student raised hand for assistance.';

      await lectureApi.raiseHand({
        session_id: sessionId || 1,
        student_id: studentId,
        question_text: fullQuestion,
      });
      setIsHandRaised(true);
      setQuestionText('');
      addToast({ type: 'success', title: 'Hand Raised', description: 'Your question was sent to the teacher.' });
      speakText('Hand raised. Your question is queued for the teacher.');
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Could not raise hand.' });
    }
  };

  // ─── Connection Badge ─────────────────────────────────────────────────────
  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected': return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Connected' };
      case 'connecting': return { color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Connecting...' };
      case 'reconnecting': return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Reconnecting...' };
      case 'disconnected': return { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Disconnected' };
      case 'failed': return { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Connection Failed' };
      default: return { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: connectionState };
    }
  };
  const connBadge = getConnectionBadge();

  const subtitleSizeClass = subtitleSize === 'sm' ? 'text-xs' : subtitleSize === 'lg' ? 'text-lg' : 'text-sm sm:text-base';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${sessionStatus === 'ACTIVE' ? 'bg-emerald-500 animate-ping' : sessionStatus === 'ENDED' ? 'bg-purple-500' : 'bg-rose-500'}`} />
            <h1 className="text-xl font-extrabold text-slate-100">Live Classroom Viewer</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              sessionStatus === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : sessionStatus === 'ENDED'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {sessionStatus === 'ACTIVE'
                ? (sessionId ? `SESSION #${sessionId} • LIVE` : 'LIVE')
                : sessionStatus === 'ENDED'
                ? 'CLASS ENDED'
                : 'TEACHER OFFLINE'}
            </span>
          </div>
          {sessionStatus === 'ACTIVE' && (
            <div className="mt-2 text-xs text-slate-300 flex items-center gap-2 flex-wrap animate-fade-in">
              {teacherName && teacherName !== 'Teacher' && teacherName !== 'Educator' && (
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-emerald-400" /> Educator: <strong className="text-emerald-400">{teacherName}</strong>
                </span>
              )}
              {sessionSubject && (
                <span className="font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/30">
                  Subject: {sessionSubject}
                </span>
              )}
              {sessionTopic && (
                <span className="font-bold text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/30">
                  Topic: {sessionTopic}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${connBadge.color}`}>
            {connBadge.label}
          </span>

          {/* Audio Control */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <button
              onClick={toggleAudioMute}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isAudioMuted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              {!isAudioMuted ? (
                <><Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" /><span>Audio ON</span></>
              ) : (
                <><VolumeX className="w-4 h-4 text-rose-400" /><span>MUTED</span></>
              )}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={isAudioMuted ? 0 : audioVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="te">Telugu (తెలుగు)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <div
            className="card p-0 overflow-hidden relative bg-black h-80 sm:h-96 flex items-center justify-center"
            onClick={() => isAudioMuted && hasAudio && handleUnmute()}
          >
            <video
              ref={videoRef} autoPlay playsInline muted={isAudioMuted}
              className={`w-full h-full object-cover transition-opacity duration-300 ${hasVideo && sessionStatus === 'ACTIVE' ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
            />

            {isAudioMuted && sessionStatus === 'ACTIVE' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleUnmute(); }}
                className="absolute top-4 right-4 z-30 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl animate-pulse text-xs cursor-pointer pointer-events-auto"
              >
                <Volume2 className="w-4 h-4" /> Tap to Unmute Audio
              </button>
            )}

            {sessionStatus === 'ENDED' || sessionStatus === 'OFFLINE' ? (
              <div className="text-center space-y-4 z-10 p-6 max-w-md bg-slate-950/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-lg shadow-purple-500/10">
                  <VideoOff className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30 shadow-sm">
                    Class Ended
                  </span>
                  <h3 className="text-xl font-black text-slate-100 mt-3 tracking-wide">Class Ended</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    This live classroom session has ended. Check recordings or AI assistant below for study notes.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (downloadsRef.current) downloadsRef.current.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-secondary text-xs border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
                  >
                    <Download className="w-4 h-4 text-sky-400" /> Lecture Recordings
                  </button>
                  <button
                    onClick={() => {
                      if (aiInputRef.current) aiInputRef.current.focus();
                    }}
                    className="btn-primary text-xs"
                  >
                    <Sparkles className="w-4 h-4" /> Ask AI Question
                  </button>
                </div>
              </div>
            ) : (
              !hasVideo && (
                <div className="text-center space-y-3 z-10">
                  <div className="w-16 h-16 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mx-auto">
                    <Video className="w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-300 font-semibold">
                    {connectionState === 'reconnecting' ? 'Reconnecting...' : connectionState === 'disconnected' ? 'Connecting to live feed...' : 'Waiting for teacher video stream...'}
                  </p>
                  {(connectionState === 'reconnecting' || connectionState === 'failed') && (
                    <button onClick={() => initWebRTC()} className="text-xs text-sky-400 flex items-center gap-1.5 mx-auto hover:underline">
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                  )}
                </div>
              )
            )}

            {/* CC Controls Overlay */}
            {sessionStatus === 'ACTIVE' && (
              <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsCcEnabled(!isCcEnabled); }}
                  className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
                    isCcEnabled
                      ? 'bg-white/20 text-white border-white/40 shadow-white/10 hover:bg-white/30'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-black font-mono">CC</span>
                  <span className="text-[10px] uppercase font-bold">{isCcEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Subtitle Size */}
                <div className="flex items-center gap-0.5 backdrop-blur-md bg-slate-900/70 rounded-lg border border-slate-700 p-0.5">
                  {(['sm', 'md', 'lg'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={(e) => { e.stopPropagation(); setSubtitleSize(size); }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                        subtitleSize === size ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>

                {/* Position Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSubtitlePosition(subtitlePosition === 'bottom' ? 'top' : 'bottom'); }}
                  className="backdrop-blur-md bg-slate-900/70 rounded-lg border border-slate-700 p-1 text-slate-400 hover:text-white transition-all"
                  title="Toggle subtitle position"
                >
                  {subtitlePosition === 'bottom' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* YouTube Style CC Subtitle Overlay */}
            {sessionStatus === 'ACTIVE' && isCcEnabled && (
              <div className={`absolute ${subtitlePosition === 'bottom' ? 'bottom-4' : 'top-14'} left-1/2 -translate-x-1/2 z-30 max-w-[92%] w-auto pointer-events-none transition-all duration-300`}>
                <div className="bg-black/85 backdrop-blur-sm px-5 py-2.5 rounded-lg shadow-2xl transition-all duration-300">
                  <p className={`text-white font-semibold ${subtitleSizeClass} text-center leading-relaxed tracking-wide`}>
                    {subtitles.length > 0
                      ? (subtitles[subtitles.length - 1].text || subtitles[subtitles.length - 1].original_text)
                      : 'Listening for live audio...'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Audio Element (hidden) */}
          <audio ref={audioRef} autoPlay playsInline muted={isAudioMuted} className="hidden" />

          {/* Auto-Read Toggle */}
          <div className="flex items-center justify-between card p-3 bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200">Auto-Read Subtitles (TTS)</span>
            </div>
            <button
              onClick={() => setAutoReadSubtitles((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoReadSubtitles ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoReadSubtitles ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Transcript Log */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-sky-400" /> Live Transcript
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {subtitles.length} entries
              </span>
            </div>
            <div ref={subtitleContainerRef} className="space-y-2 max-h-60 overflow-y-auto">
              {subtitles.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Waiting for teacher to speak...</p>
              ) : (
                subtitles.map((sub) => (
                  <div key={sub.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-bold text-sky-400">{sub.speaker}: </span>
                    <span className="text-slate-200">{sub.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summarize Button */}
          <div className="card p-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border-indigo-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" /> AI Class Summary
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Generate an AI-powered summary of this lecture</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={summaryStyle}
                  onChange={(e) => setSummaryStyle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="study_notes">Study Notes</option>
                  <option value="bullet_points">Bullet Points</option>
                </select>
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="btn-primary text-xs"
                >
                  {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {isSummarizing ? 'Generating...' : 'Summarize'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Chat, Raise Hand, Downloads */}
        <div className="space-y-6">
          {/* AI Q&A Chat Panel */}
          <div className="card space-y-3 border-sky-500/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" /> Ask AI Assistant
              </h3>
              <button
                onClick={() => setShowAiChat(!showAiChat)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {showAiChat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showAiChat && (
              <>
                {/* Chat Messages */}
                <div className="space-y-3 max-h-64 overflow-y-auto px-1">
                  {aiMessages.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <Brain className="w-8 h-8 text-sky-500/40 mx-auto" />
                      <p className="text-xs text-slate-400 font-semibold">Ask any question — academic or general knowledge!</p>
                      <p className="text-[10px] text-slate-500">AI delivers accurate, reasonable, highly detailed answers for any question.</p>
                    </div>
                  ) : (
                    aiMessages.map((msg) => (
                      <div key={msg.id} className="space-y-2">
                        {/* Student question */}
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-sky-600/20 border border-sky-500/30 rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-sky-100">
                            {msg.question}
                          </div>
                        </div>
                        {/* AI answer */}
                        {msg.answer ? (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-slate-200">
                              <span className="text-[10px] font-bold text-purple-400 block mb-1">🤖 AI Assistant</span>
                              <div className="whitespace-pre-wrap leading-relaxed">{msg.answer}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-start">
                            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2">
                              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={aiChatEndRef} />
                </div>

                {/* AI Input */}
                <div className="flex gap-2">
                  <input
                    ref={aiInputRef}
                    type="text"
                    placeholder="Ask AI to solve questions or explain doubts..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                    className="input-field text-xs flex-1"
                    disabled={isAiLoading}
                  />
                  <button
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || isAiLoading}
                    className="btn-primary text-xs px-3"
                  >
                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Raise Hand Panel */}
          <div className="card space-y-4">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Hand className="w-4 h-4 text-amber-400" /> Raise Hand / Ask Teacher
            </h3>

            {/* Category Selector */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'doubt', label: '❓ Doubt' },
                { value: 'clarification', label: '🔍 Clarification' },
                { value: 'example', label: '📝 Example' },
                { value: 'other', label: '💬 Other' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setQuestionCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    questionCategory === cat.value
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                rows={3}
                placeholder="Type your question for the teacher..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                maxLength={500}
                className="input-field text-xs"
              />
              <span className="absolute bottom-2 right-2 text-[10px] text-slate-500">
                {questionText.length}/500
              </span>
            </div>

            <button onClick={handleRaiseHand} className="btn-primary w-full text-xs" disabled={isHandRaised}>
              <Hand className="w-4 h-4" /> {isHandRaised ? 'Hand Raised ✓' : 'Raise Hand'}
            </button>

            {isHandRaised && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Your question is queued for the teacher.</span>
              </div>
            )}

            {isHandRaised && (
              <button
                onClick={() => setIsHandRaised(false)}
                className="text-xs text-slate-500 hover:text-slate-300 text-center w-full"
              >
                Lower hand
              </button>
            )}
          </div>

          {/* Downloads */}
          <div ref={downloadsRef} id="recordings-section" className="card space-y-3 border-sky-500/30">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-sky-400" /> Lecture Downloads & Recordings
            </h3>

            <a href={exportApi.downloadTranscriptUrl(sessionId || 1)} download className="btn-secondary w-full text-xs justify-between">
              <span>Transcript (TXT)</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a href={exportApi.downloadSubtitlesUrl(sessionId || 1)} download className="btn-secondary w-full text-xs justify-between">
              <span>Subtitles (VTT)</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a href={exportApi.downloadSummaryUrl(sessionId || 1)} download className="btn-secondary w-full text-xs justify-between text-purple-400 border-purple-500/30">
              <span>PDF Summary</span>
              <Download className="w-3.5 h-3.5" />
            </a>
            <a href={exportApi.downloadAudioUrl(sessionId || 1)} download className="btn-secondary w-full text-xs justify-between text-emerald-400 border-emerald-500/30">
              <span>Audio Recording (MP3)</span>
              <Download className="w-3.5 h-3.5" />
            </a>
            <a href={exportApi.downloadRecordingUrl(sessionId || 1)} download className="btn-secondary w-full text-xs justify-between text-sky-400 border-sky-500/30">
              <span>Video Recording (MP4)</span>
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSummary(false)}>
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-indigo-300 flex items-center gap-2">
                <Brain className="w-5 h-5" /> AI Lecture Summary
              </h2>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Style: {summaryData.style} • Generated {summaryData.created_at}
            </div>

            <div className="prose prose-sm prose-invert max-w-none">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {summaryData.summary_text}
              </div>
            </div>

            {summaryData.key_points.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Key Points
                </h4>
                <ul className="space-y-1.5">
                  {summaryData.key_points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summaryData.definitions.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Definitions
                </h4>
                <div className="space-y-1.5">
                  {summaryData.definitions.map((d, i) => (
                    <div key={i} className="text-xs text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">{d}</div>
                  ))}
                </div>
              </div>
            )}

            {summaryData.formulas.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Formulas
                </h4>
                <div className="space-y-1.5">
                  {summaryData.formulas.map((f, i) => (
                    <div key={i} className="text-xs text-amber-200 font-mono bg-slate-950 p-2 rounded-lg border border-amber-500/20">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
