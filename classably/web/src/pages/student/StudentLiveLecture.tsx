import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Globe, Sparkles,
  CheckCircle2, Hand, BookOpen, Clock, Shield, Maximize2, Minimize2,
  Settings as SettingsIcon, PictureInPicture2, Send, ChevronDown, ChevronUp,
  User, Play, Loader2, FileText, Check, Activity, Radio
} from 'lucide-react';
import { lectureApi, academicsApi, aiQaApi } from '../../api/client';
import { LiveSubtitle, AIQAMessage, AILectureSummary, TimetableItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { translateClientTextAsync, getCachedTranslation, getOrDraftTranslation } from '../../utils/clientTranslation';
import { getStudentSelectedLanguage, setStudentSelectedLanguage } from '../../utils/sessionLanguage';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { VisualLearningEngine } from '../../components/visuals/VisualLearningEngine';
import { Modal } from '../../components/ui/Modal';

interface MindMapNode {
  id: string;
  label: string;
  color: string;
  desc?: string;
}

interface DynamicMindMap {
  root: MindMapNode;
  children: MindMapNode[];
}

const parseStartTime = (val: string | null | undefined): string | null => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  if (/(am|pm)/i.test(str)) {
    return str;
  }

  try {
    let iso = str;
    if (iso.includes('T') && !iso.endsWith('Z') && !iso.includes('+') && !iso.slice(-6).includes('-')) {
      iso += 'Z';
    } else if (iso.includes(' ') && !iso.includes('T') && !iso.endsWith('Z')) {
      iso = iso.replace(' ', 'T') + 'Z';
    }
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch {}
  return str;
};

export const StudentLiveLecture: React.FC = () => {
  const { addToast } = useToast();
  const { speakText } = useAccessibility();
  const { user } = useAuth();

  const studentId = user?.id || 1;
  const [classroomId] = useState<number>(user?.classroom_id || 1);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Ms. Sharma');
  const [sessionSubject, setSessionSubject] = useState<string>('Live Classroom');
  const [sessionTopic, setSessionTopic] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<'ACTIVE' | 'ENDED' | 'OFFLINE'>('ACTIVE');

  // Real-Time System Timing: Start Time & Running Present Time
  const [sessionStartTime, setSessionStartTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  // Auto-update running present time from system clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Real-Time Subtitles
  const [subtitles, setSubtitles] = useState<LiveSubtitle[]>([]);
  const [targetLang, setTargetLang] = useState<string>(() => getStudentSelectedLanguage('en'));
  const [isCcEnabled, setIsCcEnabled] = useState(true);
  const targetLangRef = useRef<string>(targetLang);

  // Real-Time Live Summary
  const [liveSummaryPoints, setLiveSummaryPoints] = useState<string[]>([]);
  const [summaryData, setSummaryData] = useState<AILectureSummary | null>(null);

  // Real-Time Dynamic Mind Map
  const [mindMapData, setMindMapData] = useState<DynamicMindMap | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState<boolean>(false);

  // Raise Hand & Question State
  const [questionText, setQuestionText] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  // Media State & Controls
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [isTeacherAway, setIsTeacherAway] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('connected');
  const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isKickedRef = useRef(false);
  const subtitleClearTimerRef = useRef<any>(null);
  const subtitleContainerRef = useRef<HTMLDivElement | null>(null);
  const lastRawEnglishSubtitleRef = useRef<string>('');
  const mindMapDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const peerIdRef = useRef<string>(
    `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // ─── Live Audio Mute / Unmute Toggle ───────────────────────────────────────
  const toggleAudioMute = useCallback(async () => {
    if (isAudioMuted) {
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
      addToast({ type: 'success', title: 'Audio Unmuted', description: 'Teacher voice is now active.' });
    } else {
      setIsAudioMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
      if (audioRef.current) audioRef.current.muted = true;
      addToast({ type: 'info', title: 'Audio Muted', description: 'Teacher voice muted.' });
    }
  }, [isAudioMuted, audioVolume, addToast]);

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
    addToast({ type: 'success', title: 'Audio Unmuted', description: 'Teacher voice is now active.' });
  }, [audioVolume, addToast]);

  // ─── Live Video Stream Pause / Mute Toggle ────────────────────────────────
  const toggleVideoPlayback = useCallback(() => {
    if (!isVideoHidden) {
      setIsVideoHidden(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      addToast({ type: 'info', title: 'Video Paused', description: 'Live video stream hidden.' });
    } else {
      setIsVideoHidden(false);
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      addToast({ type: 'success', title: 'Video Resumed', description: 'Live video stream playing.' });
    }
  }, [isVideoHidden, addToast]);

  // ─── Real-Time Mind Map & Live Summary Generator ──────────────────────────
  const updateRealTimeMindMapAndSummary = useCallback((currentSubs: LiveSubtitle[], topic: string, subject: string) => {
    if (mindMapDebounceRef.current) {
      clearTimeout(mindMapDebounceRef.current);
    }

    mindMapDebounceRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      const fullText = currentSubs.map((s) => s.text || s.original_text || '').filter(Boolean).join(' ').trim();
      const effectiveTopic = topic || subject || (currentSubs.length > 0 ? currentSubs[0].text?.split(' ')[0] : '') || 'Active Lecture';

      // 1. Generate Live Summary Points in Real-Time from Speech
      if (currentSubs.length > 0) {
        const rawPoints: string[] = [];
        currentSubs.slice(-6).forEach((s) => {
          const t = (s.text || s.original_text || '').trim();
          if (t.length > 12 && !rawPoints.includes(t)) {
            rawPoints.push(t);
          }
        });

        if (rawPoints.length > 0) {
          setLiveSummaryPoints(rawPoints);
        }
      }

      // 2. Generate Real Dynamic Mind Map from Speech & Context
      if (fullText.length > 10 || effectiveTopic.length > 2) {
        setIsGeneratingMap(true);
        try {
          const res = await aiQaApi.visualizeDiagram({
            topic: effectiveTopic,
            transcript: fullText,
            subject: subject || 'Science',
            target_lang: targetLangRef.current,
          });

          if (res.data?.diagram?.nodes && res.data.diagram.nodes.length >= 2) {
            const nodes = res.data.diagram.nodes;
            const rootLabel = res.data.diagram.title?.split('(')[0]?.trim() || nodes[0].label || effectiveTopic;
            const rootNode: MindMapNode = {
              id: nodes[0].id || 'root',
              label: rootLabel.length > 18 ? rootLabel.substring(0, 16) + '...' : rootLabel,
              color: '#2563eb',
              desc: nodes[0].desc,
            };

            const childPalette = ['#0284c7', '#16a34a', '#ea580c', '#8b5cf6', '#ec4899'];
            const children: MindMapNode[] = nodes.slice(1, 4).map((n: any, idx: number) => ({
              id: n.id || `child_${idx}`,
              label: (targetLangRef.current !== 'en' && n.translated_label) ? n.translated_label : n.label,
              color: n.color || childPalette[idx % childPalette.length],
              desc: n.desc,
            }));

            setMindMapData({ root: rootNode, children });
            return;
          }
        } catch {
          // Fallback to client-side semantic node extraction
        } finally {
          if (isMountedRef.current) setIsGeneratingMap(false);
        }

        // Semantic Fallback Generator based on live speech words
        if (currentSubs.length > 0) {
          const rootNode: MindMapNode = {
            id: 'root_live',
            label: effectiveTopic.length > 16 ? effectiveTopic.substring(0, 14) + '..' : effectiveTopic,
            color: '#2563eb',
          };

          const words = fullText.split(/[.,!?\s]+/).filter((w) => w.length > 4);
          const uniqueKeywords = Array.from(new Set(words)).slice(0, 3);
          const childColors = ['#0284c7', '#16a34a', '#ea580c'];

          const children: MindMapNode[] = uniqueKeywords.map((kw, i) => ({
            id: `kw_${i}`,
            label: kw.charAt(0).toUpperCase() + kw.slice(1),
            color: childColors[i % childColors.length],
          }));

          if (children.length >= 2) {
            setMindMapData({ root: rootNode, children });
          }
        }
      }
    }, 1200);
  }, []);

  // Language Change Handler
  const handleLanguageChange = (newLang: string) => {
    setTargetLang(newLang);
    targetLangRef.current = newLang;
    setStudentSelectedLanguage(newLang);

    if (activeSubtitleText) {
      if (newLang === 'en') {
        setActiveSubtitleText(lastRawEnglishSubtitleRef.current || activeSubtitleText);
      } else {
        const raw = lastRawEnglishSubtitleRef.current;
        const cached = raw ? (getCachedTranslation(raw, newLang) || getOrDraftTranslation(raw, newLang)) : null;
        if (cached && cached !== raw) {
          setActiveSubtitleText(cached);
        }
        if (raw) {
          translateClientTextAsync(raw, newLang).then((translated) => {
            if (targetLangRef.current === newLang && translated && translated !== raw) {
              setActiveSubtitleText(translated);
            }
          }).catch(() => {});
        }
      }
    }

    if (newLang === 'en') {
      setSubtitles((prev) => prev.map((s) => ({
        ...s,
        text: s.original_text || s.text,
        translated_text: s.original_text || s.text,
      })));
    } else {
      setSubtitles((prev) => prev.map((s) => {
        const raw = (s.original_text || s.text || '').trim();
        if (s.translations && s.translations[newLang] && s.translations[newLang] !== raw) {
          return { ...s, text: s.translations[newLang], translated_text: s.translations[newLang] };
        }
        const cached = getCachedTranslation(raw, newLang) || getOrDraftTranslation(raw, newLang);
        const display = (cached && cached !== raw) ? cached : (s.translated_text && s.language === newLang && s.translated_text !== raw ? s.translated_text : (cached || s.text));
        return { ...s, text: display, translated_text: display };
      }));

      subtitles.forEach((s) => {
        const raw = (s.original_text || s.text || '').trim();
        if (raw) {
          translateClientTextAsync(raw, newLang).then((translated) => {
            if (targetLangRef.current === newLang && translated && translated !== raw) {
              setSubtitles((prev) => prev.map((item) =>
                item.id === s.id || (item.original_text && item.original_text.trim() === raw)
                  ? { ...item, text: translated, translated_text: translated }
                  : item
              ));
            }
          }).catch(() => {});
        }
      });
    }
  };

  useEffect(() => {
    if (subtitleContainerRef.current) {
      subtitleContainerRef.current.scrollTop = subtitleContainerRef.current.scrollHeight;
    }
  }, [subtitles]);

  // Attach Stream
  const attachStreamToElements = useCallback((stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (videoRef.current && videoTracks.length > 0) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }

    if (audioRef.current && audioTracks.length > 0) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      audioRef.current.play().catch(() => {});
    }

    if (videoTracks.length > 0) setHasVideo(true);
    if (audioTracks.length > 0) setHasAudio(true);
  }, []);

  // WebRTC
  const initWebRTC = useCallback(() => {
    if (!isMountedRef.current || isKickedRef.current) return;

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
      if (isKickedRef.current) {
        ws.close();
        return;
      }
      setConnectionState('connected');
      ws.send(JSON.stringify({
        type: 'join', role: 'student', classroom_id: classroomId, peer_id: peerIdRef.current, student_id: studentId,
      }));
      ws.send(JSON.stringify({
        type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current, student_id: studentId,
      }));
    };

    ws.onclose = () => {
      if (isMountedRef.current && !isKickedRef.current) {
        setConnectionState('reconnecting');
        reconnectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && !isKickedRef.current) initWebRTC();
        }, 3000);
      }
    };

    ws.onerror = () => {};

    ws.onmessage = async (event) => {
      if (!isMountedRef.current) return;
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'student_kicked') {
          const isTargeted = message.student_id === studentId ||
                             message.student_id === user?.id ||
                             message.peer_id === peerIdRef.current;

          if (isTargeted) {
            isKickedRef.current = true;
            setIsKicked(true);
            addToast({
              type: 'error',
              title: 'Removed from Session',
              description: message.message || 'You have been removed from this live lecture session by the teacher.',
            });
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
            if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
            setSessionStatus('OFFLINE');
            setConnectionState('failed');
            setHasVideo(false);
            setHasAudio(false);
            return;
          }
        }

        if (message.type === 'lecture_ended' || message.type === 'session_ended') {
          setSessionStatus('ENDED');
          sessionStatusRef.current = 'ENDED';
          setConnectionState('disconnected');
          setHasVideo(false);
          setHasAudio(false);
          setSubtitles([]);
          setLiveSummaryPoints([]);
          setSummaryData(null);
          setMindMapData(null);
          setActiveSubtitleText(null);
          setSessionTopic('');
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          if (videoRef.current) { videoRef.current.srcObject = null; }
          addToast({
            type: 'info',
            title: 'Live Class Has Ended',
            description: 'The teacher has ended this lecture session.',
          });
          return;
        }

        if (message.type === 'teacher_away') {
          setIsTeacherAway(true);
          setConnectionState('disconnected');
          return;
        }

        if (message.type === 'teacher_offline') {
          setIsTeacherAway(true);
          setConnectionState('disconnected');
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          return;
        }

        if (message.type === 'teacher_online' || message.type === 'teacher_resumed') {
          setIsTeacherAway(false);
          setConnectionState('connecting');
          addToast({
            type: 'success',
            title: 'Teacher Returned',
            description: 'Live broadcast and speech subtitles are resuming...',
          });
          if (!isKickedRef.current) {
            if (pcRef.current) {
              pcRef.current.ontrack = null;
              pcRef.current.onicecandidate = null;
              pcRef.current.onconnectionstatechange = null;
              pcRef.current.close();
              pcRef.current = null;
            }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current, student_id: studentId,
              }));
            }
          }
          return;
        }

        if (message.type === 'session_info' || message.type === 'lecture_started' || message.type === 'session_updated') {
          if (message.teacher_name && message.teacher_name !== teacherNameRef.current) {
            teacherNameRef.current = message.teacher_name;
            setTeacherName(message.teacher_name);
          }
          if (message.subject && message.subject !== sessionSubjectRef.current) {
            sessionSubjectRef.current = message.subject;
            setSessionSubject(message.subject);
          }
          if (message.topic && message.topic !== sessionTopicRef.current) {
            sessionTopicRef.current = message.topic;
            setSessionTopic(message.topic);
          }
          if (message.session_id && message.session_id !== sessionIdRef.current) {
            sessionIdRef.current = message.session_id;
            setSessionId(message.session_id);
          }
          if (message.started_at) {
            const parsed = parseStartTime(message.started_at);
            if (parsed && parsed !== sessionStartTimeRef.current) {
              sessionStartTimeRef.current = parsed;
              setSessionStartTime(parsed);
            }
          }
          if (sessionStatusRef.current !== 'ACTIVE') {
            sessionStatusRef.current = 'ACTIVE';
            setSessionStatus('ACTIVE');
          }
          return;
        }

        // Live Subtitles Stream
        if (message.type === 'subtitle' && message.subtitle) {
          const sub = message.subtitle;
          const currentLang = targetLangRef.current;
          const rawText = (sub.text || sub.original_text || '').trim();
          if (!rawText) return;

          const subId = sub.id || Date.now();
          lastRawEnglishSubtitleRef.current = rawText;

          const newSub: LiveSubtitle = {
            id: subId,
            speaker: sub.speaker || teacherName,
            text: rawText,
            original_text: rawText,
            translated_text: rawText,
            timestamp: sub.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          };

          if (currentLang && currentLang !== 'en') {
            translateClientTextAsync(rawText, currentLang).then((trans) => {
              if (trans) {
                setActiveSubtitleText(trans);
                setSubtitles((prev) => {
                  const updated = [...prev, { ...newSub, text: trans, translated_text: trans }];
                  updateRealTimeMindMapAndSummary(updated, sessionTopicRef.current, sessionSubjectRef.current);
                  return updated;
                });
              }
            }).catch(() => {
              setSubtitles((prev) => {
                const updated = [...prev, newSub];
                updateRealTimeMindMapAndSummary(updated, sessionTopicRef.current, sessionSubjectRef.current);
                return updated;
              });
            });
          } else {
            setActiveSubtitleText(rawText);
            setSubtitles((prev) => {
              const updated = [...prev, newSub];
              updateRealTimeMindMapAndSummary(updated, sessionTopicRef.current, sessionSubjectRef.current);
              return updated;
            });
          }

          if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
          subtitleClearTimerRef.current = setTimeout(() => {
            setActiveSubtitleText(null);
          }, 3000);
          return;
        }

        if (message.target_id && message.target_id !== peerIdRef.current && message.target_id !== 'all') return;

        if (message.type === 'offer' && message.sdp) {
          setIsTeacherAway(false);
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

          pc.ontrack = (trackEvent) => {
            setIsTeacherAway(false);
            trackEvent.track.onunmute = () => {
              setIsTeacherAway(false);
              if (trackEvent.track.kind === 'video') setHasVideo(true);
              if (trackEvent.track.kind === 'audio') setHasAudio(true);
              if (remoteStreamRef.current) attachStreamToElements(remoteStreamRef.current);
            };

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
            attachStreamToElements(stream);
          };

          pc.onicecandidate = (iceEvent) => {
            if (iceEvent.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'candidate', candidate: iceEvent.candidate,
                classroom_id: classroomId, peer_id: peerIdRef.current, target_id: 'teacher',
              }));
            }
          };

          pc.onconnectionstatechange = () => {
            setConnectionState(pc.connectionState);
            if (pc.connectionState === 'connected') {
              setIsTeacherAway(false);
              setHasVideo(true);
            }
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
  }, [classroomId, attachStreamToElements, addToast, studentId, teacherName, user?.id, updateRealTimeMindMapAndSummary]);

  const sessionIdRef = useRef<number | null>(sessionId);
  const teacherNameRef = useRef<string>(teacherName);
  const sessionSubjectRef = useRef<string>(sessionSubject);
  const sessionTopicRef = useRef<string>(sessionTopic);
  const sessionStatusRef = useRef<'ACTIVE' | 'ENDED' | 'OFFLINE'>(sessionStatus);
  const sessionStartTimeRef = useRef<string>(sessionStartTime);

  // Sync refs with state
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { teacherNameRef.current = teacherName; }, [teacherName]);
  useEffect(() => { sessionSubjectRef.current = sessionSubject; }, [sessionSubject]);
  useEffect(() => { sessionTopicRef.current = sessionTopic; }, [sessionTopic]);
  useEffect(() => { sessionStatusRef.current = sessionStatus; }, [sessionStatus]);
  useEffect(() => { sessionStartTimeRef.current = sessionStartTime; }, [sessionStartTime]);

  // Load Timetable once on mount / classroom change
  useEffect(() => {
    let active = true;
    academicsApi.getTodayTimetable().then((res) => {
      if (active && Array.isArray(res.data) && res.data.length > 0) {
        const item: TimetableItem = res.data[0];
        if (item.teacher_name && (!teacherNameRef.current || teacherNameRef.current === 'Teacher' || teacherNameRef.current === 'Faculty Educator')) {
          teacherNameRef.current = item.teacher_name;
          setTeacherName(item.teacher_name);
        }
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [classroomId]);

  // Session Discovery (Flicker-Free)
  useEffect(() => {
    if (isKickedRef.current) return;

    const fetchActiveSessions = async () => {
      if (isKickedRef.current) return;
      try {
        const allActiveRes = await lectureApi.getAllActiveSessions();

        if (allActiveRes.data?.active_sessions && Array.isArray(allActiveRes.data.active_sessions)) {
          const sessions: any[] = allActiveRes.data.active_sessions;
          if (sessions.length > 0) {
            const currentId = sessionIdRef.current;
            const selected = sessions.find((s) => s.id === currentId) || sessions[0];

            if (selected.id && selected.id !== sessionIdRef.current) {
              sessionIdRef.current = selected.id;
              setSessionId(selected.id);
            }
            if (selected.teacher_name && selected.teacher_name !== teacherNameRef.current) {
              teacherNameRef.current = selected.teacher_name;
              setTeacherName(selected.teacher_name);
            }
            if (selected.subject && selected.subject !== sessionSubjectRef.current) {
              sessionSubjectRef.current = selected.subject;
              setSessionSubject(selected.subject);
            }
            if (selected.topic && selected.topic !== sessionTopicRef.current) {
              sessionTopicRef.current = selected.topic;
              setSessionTopic(selected.topic);
            }
            if (selected.started_at) {
              const parsed = parseStartTime(selected.started_at);
              if (parsed && parsed !== sessionStartTimeRef.current) {
                sessionStartTimeRef.current = parsed;
                setSessionStartTime(parsed);
              }
            }
            if (sessionStatusRef.current !== 'ACTIVE') {
              sessionStatusRef.current = 'ACTIVE';
              setSessionStatus('ACTIVE');
            }
            return;
          }
        }

        const res = await lectureApi.getActiveSession(classroomId);
        const data = res.data;
        if (data?.session?.id) {
          if (data.session.id !== sessionIdRef.current) {
            sessionIdRef.current = data.session.id;
            setSessionId(data.session.id);
          }
          if (data.session.teacher_name && data.session.teacher_name !== teacherNameRef.current) {
            teacherNameRef.current = data.session.teacher_name;
            setTeacherName(data.session.teacher_name);
          }
          if (data.session.subject && data.session.subject !== sessionSubjectRef.current) {
            sessionSubjectRef.current = data.session.subject;
            setSessionSubject(data.session.subject);
          }
          if (data.session.topic && data.session.topic !== sessionTopicRef.current) {
            sessionTopicRef.current = data.session.topic;
            setSessionTopic(data.session.topic);
          }
          if (data.session.started_at) {
            const parsed = parseStartTime(data.session.started_at);
            if (parsed && parsed !== sessionStartTimeRef.current) {
              sessionStartTimeRef.current = parsed;
              setSessionStartTime(parsed);
            }
          }
          const rawStatus = (data.session.status || 'ACTIVE').toUpperCase();
          const targetStatus = (data.is_active === false || rawStatus === 'ENDED' ? 'ENDED' : 'ACTIVE');
          if (targetStatus !== sessionStatusRef.current) {
            sessionStatusRef.current = targetStatus;
            setSessionStatus(targetStatus);
            if (targetStatus === 'ENDED') {
              setSubtitles([]);
              setLiveSummaryPoints([]);
              setSummaryData(null);
              setMindMapData(null);
              setActiveSubtitleText(null);
              setSessionTopic('');
              if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
              if (videoRef.current) { videoRef.current.srcObject = null; }
              setHasVideo(false);
              setHasAudio(false);
            }
          }
        } else {
          if (sessionIdRef.current !== null) {
            sessionIdRef.current = null;
            setSessionId(null);
          }
          if (sessionStatusRef.current !== 'ENDED') {
            sessionStatusRef.current = 'ENDED';
            setSessionStatus('ENDED');
          }
          setSubtitles([]);
          setLiveSummaryPoints([]);
          setSummaryData(null);
          setMindMapData(null);
          setActiveSubtitleText(null);
          setSessionTopic('');
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          if (videoRef.current) { videoRef.current.srcObject = null; }
          setHasVideo(false);
          setHasAudio(false);
        }
      } catch {
        // Retain stable state on network blip
      }
    };

    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, [classroomId]);

  // Load existing session subtitles & summary on session connect
  useEffect(() => {
    if (!sessionId || sessionStatus !== 'ACTIVE') return;
    lectureApi.getSubtitles(sessionId, targetLang).then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0 && sessionStatusRef.current === 'ACTIVE') {
        setSubtitles(res.data);
        updateRealTimeMindMapAndSummary(res.data, sessionTopicRef.current, sessionSubjectRef.current);
      }
    }).catch(() => {});

    aiQaApi.getSummary(sessionId).then((res) => {
      if (res.data && sessionStatusRef.current === 'ACTIVE') {
        setSummaryData(res.data);
        if (res.data.key_points && Array.isArray(res.data.key_points)) {
          setLiveSummaryPoints(res.data.key_points);
        }
      }
    }).catch(() => {});
  }, [sessionId, targetLang, sessionStatus, updateRealTimeMindMapAndSummary]);

  // Init WebRTC
  useEffect(() => {
    isMountedRef.current = true;
    initWebRTC();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, [initWebRTC]);

  // Auto-connect video stream ping when entering live room or awaiting stream
  useEffect(() => {
    if (isKicked || sessionStatus !== 'ACTIVE') return;

    const pingInterval = setInterval(() => {
      if (!hasVideo && wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isKickedRef.current && sessionStatusRef.current === 'ACTIVE') {
        wsRef.current.send(JSON.stringify({
          type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current, student_id: studentId,
        }));
      }
    }, 2000);

    return () => clearInterval(pingInterval);
  }, [hasVideo, isKicked, sessionStatus, classroomId, studentId]);

  // Raise Hand / Submit Question
  const handleAskQuestion = async () => {
    const q = questionText.trim();
    if (!q) {
      handleRaiseHandOnly();
      return;
    }

    setIsAsking(true);
    try {
      await lectureApi.raiseHand({
        session_id: sessionId || 1,
        student_id: studentId,
        question_text: q,
      });
      setIsHandRaised(true);
      setQuestionText('');
      addToast({ type: 'success', title: 'Question Sent', description: 'Your question was submitted to the teacher.' });
      speakText('Question sent. Your question has been queued for the teacher.');
    } catch {
      addToast({ type: 'error', title: 'Submission Error', description: 'Could not send question.' });
    } finally {
      setIsAsking(false);
    }
  };

  const handleRaiseHandOnly = async () => {
    try {
      await lectureApi.raiseHand({
        session_id: sessionId || 1,
        student_id: studentId,
        question_text: 'Student raised hand for attention.',
      });
      setIsHandRaised(!isHandRaised);
      addToast({
        type: 'success',
        title: isHandRaised ? 'Hand Lowered' : 'Hand Raised',
        description: isHandRaised ? 'You lowered your hand.' : 'Your teacher has been notified.',
      });
    } catch {
      setIsHandRaised(!isHandRaised);
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const studentGreetingName = user?.student?.name || user?.full_name?.split(' ')[0] || 'Anil';

  // Summary points to display
  const activeSummaryPoints = liveSummaryPoints.length > 0
    ? liveSummaryPoints
    : (summaryData?.key_points || []).filter(Boolean);

  return (
    <div className="w-full max-w-[1360px] mx-auto space-y-3 animate-fade-in font-sans text-slate-900 pb-2">
      {/* ─── Top Greeting Bar ────────────────────────────────────────── */}
      <header className="px-0.5">
        <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
          Welcome, {studentGreetingName}, Continue your learning in your active class.
        </h1>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          UPPER SECTION (2-Column Grid)
          Left: Live Class Info + Live Video + Live Controls
          Right: Dynamic Topic Map + Have a Question? directly below
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.62fr_1fr] gap-3.5 items-stretch">
        {/* LEFT COLUMN: Info Card + Video + Controls */}
        <div className="flex flex-col space-y-2.5 min-w-0">
          {/* Top Live Class Information Card (Compact Height & Real-Time Clock) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 px-3.5 py-2 sm:py-2.5 shadow-xs flex flex-col justify-center shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-600 leading-none">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span>LIVE NOW</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#0f172a] tracking-tight truncate leading-tight my-0.5">
              {sessionSubject || sessionTopic || 'Live Lecture Session'}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium leading-none">
              <span className="flex items-center gap-1 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {teacherName || 'Faculty Educator'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-600 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{sessionStartTime} - {currentTimeDisplay}</span>
              </span>
            </div>
          </div>

          {/* Large Live Video Player */}
          <div
            ref={videoContainerRef}
            className="bg-[#0b101b] rounded-2xl overflow-hidden relative aspect-[16/9] min-h-[220px] max-h-[360px] w-full flex items-center justify-center shadow-xs select-none group flex-1"
            onClick={() => isAudioMuted && hasAudio && handleUnmute()}
          >
            {/* Live WebRTC Stream Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isAudioMuted}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasVideo && sessionStatus === 'ACTIVE' && !isTeacherAway && !isVideoHidden ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            />

            {/* Video Paused Overlay */}
            {isVideoHidden && sessionStatus === 'ACTIVE' && !isTeacherAway && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xs text-center space-y-2">
                <VideoOff className="w-8 h-8 text-slate-400" />
                <p className="text-xs font-semibold text-slate-200">Video Stream Paused by Student</p>
                <button
                  type="button"
                  onClick={toggleVideoPlayback}
                  className="text-[11px] text-[#38bdf8] hover:underline cursor-pointer"
                >
                  Click video button to resume
                </button>
              </div>
            )}

            {/* Centered Live / Unmute Play Indicator */}
            {(!hasVideo || isAudioMuted) && !isTeacherAway && sessionStatus === 'ACTIVE' && !isKicked && !isVideoHidden && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAudioMuted) handleUnmute();
                }}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 border-2 border-white/90 flex items-center justify-center text-white backdrop-blur-xs transition-all transform hover:scale-105 cursor-pointer z-20 shadow-lg"
                aria-label="Play or Unmute Live Class"
              >
                <Play className="w-7 h-7 text-white fill-white ml-0.5" />
              </button>
            )}

            {/* 1. Teacher Stepped Away Overlay */}
            {isTeacherAway && sessionStatus === 'ACTIVE' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md text-center animate-fade-in space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-white tracking-tight">Teacher Stepped Away</h3>
                  <p className="text-xs text-amber-200/85 leading-relaxed">
                    The educator has temporarily navigated away from the lecture screen. Please wait — the live video and speech subtitles will automatically resume when the teacher returns.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-amber-300 font-mono bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Auto-resuming upon teacher return</span>
                </div>
              </div>
            )}

            {/* 2. Class Has Ended Overlay */}
            {sessionStatus === 'ENDED' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center animate-fade-in space-y-3">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shadow-lg">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-white tracking-tight">Live Class Has Ended</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This lecture session has concluded. You can review the full live transcript and session summary below or explore study notes and recordings in the sidebar.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-purple-300 bg-purple-950/70 border border-purple-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                  Session Concluded
                </span>
              </div>
            )}

            {/* 3. Removed from Session Overlay */}
            {isKicked && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center animate-fade-in space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-lg">
                  <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-white tracking-tight">Removed from Class Session</h3>
                  <p className="text-xs text-rose-200/85 leading-relaxed">
                    You were removed from this lecture session by the faculty educator.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Classroom Awaiting Teacher */}
            {(!hasVideo || sessionStatus === 'OFFLINE') && !isTeacherAway && sessionStatus !== 'ENDED' && !isKicked && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs text-center animate-fade-in space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-[#38bdf8] shadow-lg">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-0.5 max-w-xs">
                  <h3 className="text-sm font-bold text-white tracking-tight">Awaiting Live Broadcast</h3>
                  <p className="text-[11px] text-slate-400">
                    Live stream and speech recognition will appear automatically when the educator begins broadcasting.
                  </p>
                </div>
              </div>
            )}

            {/* In-Video Closed Captions Overlay */}
            {isCcEnabled && activeSubtitleText && sessionStatus === 'ACTIVE' && !isTeacherAway && !isKicked && (
              <div className="absolute inset-x-0 bottom-14 z-20 px-4 flex justify-center pointer-events-none">
                <div className="bg-black/85 backdrop-blur-md text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl border border-white/15 shadow-2xl max-w-xl text-center leading-relaxed animate-fade-in">
                  <span className="text-yellow-300 font-bold mr-1.5 text-xs uppercase">{teacherName}:</span>
                  <span>{activeSubtitleText}</span>
                </div>
              </div>
            )}

            {/* Video Bottom Floating Bar */}
            <div className="absolute bottom-3 inset-x-3.5 z-20 flex items-center justify-between text-white pointer-events-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/10 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-bold text-[11px] uppercase tracking-wider">LIVE</span>
                <span className="text-white/40">•</span>
                <span className="truncate max-w-[200px] sm:max-w-[320px] text-[11.5px]">
                  {sessionSubject || 'Live Classroom Stream'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                <button
                  type="button"
                  title="Stream Settings"
                  className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Picture in Picture"
                  onClick={async () => {
                    try {
                      if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                      } else if (videoRef.current) {
                        await videoRef.current.requestPictureInPicture();
                      }
                    } catch {}
                  }}
                  className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  onClick={toggleFullscreen}
                  className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Hidden Fallback Audio Element */}
          <audio ref={audioRef} autoPlay playsInline muted={isAudioMuted} className="hidden" />

          {/* Live Controls Bar (Directly below video) */}
          <div className="flex items-center justify-between gap-2 px-0.5 shrink-0">
            {/* Left: Raise Hand Button */}
            <button
              type="button"
              onClick={handleRaiseHandOnly}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isHandRaised
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Hand className={`w-4 h-4 ${isHandRaised ? 'text-amber-600 fill-amber-500' : 'text-slate-600'}`} />
              <span>{isHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            {/* Right Control Group: Language, Mic/Audio, Cam/Video, CC */}
            <div className="flex items-center gap-2">
              <LanguageSelector
                selectedLanguage={targetLang}
                onLanguageChange={handleLanguageChange}
                size="sm"
                variant="light"
              />

              {/* Mute / Unmute Incoming Teacher Audio */}
              <button
                type="button"
                onClick={toggleAudioMute}
                title={isAudioMuted ? 'Unmute teacher audio' : 'Mute teacher audio'}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  !isAudioMuted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {!isAudioMuted ? (
                  <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                )}
              </button>

              {/* Pause / Resume Live Video Stream */}
              <button
                type="button"
                onClick={toggleVideoPlayback}
                title={isVideoHidden ? 'Resume live video stream' : 'Pause / mute live video stream'}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  !isVideoHidden
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {!isVideoHidden ? (
                  <Video className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VideoOff className="w-4 h-4 text-rose-500" />
                )}
              </button>

              {/* Closed Captions CC Toggle */}
              <button
                type="button"
                onClick={() => setIsCcEnabled(!isCcEnabled)}
                title={isCcEnabled ? 'Disable Subtitles' : 'Enable Subtitles'}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isCcEnabled
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                CC
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Dynamic Topic Map + Have a Question? */}
        <div className="flex flex-col space-y-2.5 min-w-0 justify-between">
          {/* Dynamic Topic Map Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col flex-1 min-h-[250px] justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1d3bb5]" />
                <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  <span>Topic Map</span>
                  {isGeneratingMap && <Loader2 className="w-3 h-3 text-[#1d3bb5] animate-spin" />}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTopicModal(true)}
                title="Expand Topic Map"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Concept Tree Diagram (Real-Time Synchronized with Speech) */}
            <div className="py-3 flex flex-col items-center justify-center flex-1">
              {mindMapData ? (
                <div className="w-full max-w-[300px] flex flex-col items-center animate-fade-in">
                  {/* Dynamic Root Concept Node */}
                  <div
                    className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-xs truncate max-w-[220px]"
                    style={{ backgroundColor: mindMapData.root.color || '#2563eb' }}
                    title={mindMapData.root.label}
                  >
                    {mindMapData.root.label}
                  </div>

                  {/* Adaptive Dynamic Connecting Lines */}
                  {mindMapData.children.length > 0 && (
                    <svg className="w-full h-12 overflow-visible" viewBox="0 0 280 48">
                      {/* Stem from top node */}
                      <line x1="140" y1="0" x2="140" y2="24" stroke="#cbd5e1" strokeWidth="1.5" />
                      {/* Horizontal distributor */}
                      <line
                        x1={mindMapData.children.length === 1 ? 140 : 45}
                        y1="24"
                        x2={mindMapData.children.length === 1 ? 140 : 235}
                        y2="24"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                      />
                      {/* Branch lines to children */}
                      {mindMapData.children.map((_, idx) => {
                        const count = mindMapData.children.length;
                        const x = count === 1 ? 140 : count === 2 ? (idx === 0 ? 70 : 210) : (idx === 0 ? 45 : idx === 1 ? 140 : 235);
                        return (
                          <React.Fragment key={idx}>
                            <line x1={x} y1="24" x2={x} y2="48" stroke="#cbd5e1" strokeWidth="1.5" />
                            <line x1="140" y1="0" x2={x} y2="48" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" />
                          </React.Fragment>
                        );
                      })}
                    </svg>
                  )}

                  {/* Dynamic Child Nodes from Spoken Concepts */}
                  <div
                    className={`w-full grid gap-2 pt-1 text-center ${
                      mindMapData.children.length === 1
                        ? 'grid-cols-1 max-w-[140px]'
                        : mindMapData.children.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                    }`}
                  >
                    {mindMapData.children.map((child) => (
                      <div
                        key={child.id}
                        className="px-2.5 py-1.5 rounded-full text-white text-[11px] font-bold truncate shadow-xs cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: child.color }}
                        title={child.desc || child.label}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Empty / Listening State when class starts */
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-400">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1d3bb5] animate-pulse">
                    <Activity className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">AI Topic Mapping Active</p>
                  <p className="text-[11px] text-slate-400 max-w-[220px]">
                    Concepts and structured mind maps will generate dynamically as your teacher speaks.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Have a Question? Card (Directly below Topic Map) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs shrink-0">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Have a Question?</h3>
            <p className="text-[11.5px] text-slate-500 mb-2">Ask your question...</p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask your question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1d3bb5] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleAskQuestion}
                disabled={isAsking}
                className="px-4 py-2 rounded-xl bg-[#1d3bb5] hover:bg-[#183099] text-white text-xs font-black tracking-wide uppercase transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ASK'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          LOWER SECTION (Side-by-Side 2-Column Row)
          Left: Real-Time Live Session Summary
          Right: Real-Time Live Transcript & Translated Captions
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch pt-0.5">
        {/* ─── LEFT: REAL-TIME LIVE SESSION SUMMARY ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col h-[165px] min-h-[155px]">
          <div className="flex items-center justify-between mb-2.5 shrink-0">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Live Session Summary
            </h3>
            {subtitles.length > 0 && (
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            )}
          </div>

          <ul className="space-y-2 overflow-y-auto pr-1 flex-1">
            {activeSummaryPoints.length > 0 ? (
              activeSummaryPoints.map((point, index) => (
                <li key={`${point}-${index}`} className="flex items-start gap-2.5 text-xs text-slate-700 animate-fade-in">
                  <div className="w-4 h-4 rounded-full border border-blue-500 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="leading-tight font-medium text-slate-800">{point}</span>
                </li>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-3 space-y-1">
                <Sparkles className="w-4 h-4 text-slate-300 animate-pulse" />
                <p className="text-xs">Summary key points will be captured in real-time as the lecture progresses.</p>
              </div>
            )}
          </ul>
        </div>

        {/* ─── RIGHT: REAL-TIME LIVE TRANSCRIPT & TRANSLATED CAPTIONS ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col h-[165px] min-h-[155px]">
          <div className="flex items-center justify-between mb-2.5 shrink-0">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Live Transcript & Translated Captions
            </h3>
            {subtitles.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                {subtitles.length} Spoken Captions
              </span>
            )}
          </div>

          <div
            ref={subtitleContainerRef}
            className="space-y-2 overflow-y-auto pr-1 text-xs scroll-smooth flex-1"
          >
            {subtitles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-3 space-y-1">
                <Mic className="w-4 h-4 text-slate-300 animate-pulse" />
                <p className="text-xs">Live spoken captions will appear here in real time as your educator speaks...</p>
              </div>
            ) : (
              subtitles.map((sub, idx) => (
                <div key={sub.id || idx} className="flex items-start gap-3 animate-fade-in">
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-[10.5px] font-semibold text-slate-600 font-mono mt-0.5">
                    {sub.timestamp || '10:00 AM'}
                  </span>
                  <p className="text-slate-700 text-xs leading-relaxed font-normal">
                    {sub.text || sub.translated_text || sub.original_text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Expanded Visual Learning Engine Modal ──────────────────────── */}
      <Modal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        title="Interactive Concept & Topic Map"
        description="Deep-dive into live lecture concepts with real-time AI synchronization."
        size="xl"
      >
        <div className="p-1">
          <VisualLearningEngine
            currentTopic={sessionTopic || sessionSubject || 'Live Lecture'}
            liveTranscript={subtitles.length > 0 ? subtitles[subtitles.length - 1].text : ''}
            fullTranscript={subtitles.map((s) => s.text).join(' ')}
            subject={sessionSubject || 'Science & Engineering'}
            targetLang={targetLang}
          />
        </div>
      </Modal>
    </div>
  );
};
