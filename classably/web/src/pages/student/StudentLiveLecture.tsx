import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Video, VideoOff, HelpCircle, Volume2, VolumeX, Globe, Sparkles, Download, CheckCircle2,
  RefreshCw, Mic, MessageSquare, Send, BookOpen, X, ChevronDown, ChevronUp,
  Loader2, FileText, Brain, Hand, School, Radio, UserCheck, Clock, Shield, Trash2
} from 'lucide-react';
import { lectureApi, exportApi, aiQaApi, adminApi, academicsApi } from '../../api/client';
import { LiveSubtitle, AIQAMessage, AILectureSummary, User, TimetableItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { translateClientText, translateClientTextAsync, getCachedTranslation, getOrDraftTranslation } from '../../utils/clientTranslation';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../../utils/languages';
import { getStudentSelectedLanguage, setStudentSelectedLanguage } from '../../utils/sessionLanguage';

import { VisualLearningEngine } from '../../components/visuals/VisualLearningEngine';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { Modal } from '../../components/ui/Modal';

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
  const [targetLang, setTargetLang] = useState<string>(() => getStudentSelectedLanguage('en'));
  const [isCcEnabled, setIsCcEnabled] = useState(true);
  const targetLangRef = useRef<string>(targetLang);

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
  const [autoReadSubtitles, setAutoReadSubtitles] = useState<boolean>(false);
  const [isKicked, setIsKicked] = useState(false);
  const isKickedRef = useRef(false);
  const [isTeacherAway, setIsTeacherAway] = useState(false);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);
  const subtitleClearTimerRef = useRef<any>(null);

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
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const lastRawEnglishSubtitleRef = useRef<string>('');
  const lastProcessedSubSeqRef = useRef<number>(0);
  const [liveSpeechText, setLiveSpeechText] = useState<string>('');

  // Ensure student page always loads positioned at the exact TOP of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setTargetLang(newLang);
    targetLangRef.current = newLang;
    setStudentSelectedLanguage(newLang);

    // If active subtitle is currently showing on screen, update it to the new language immediately
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

    // Update transcript log entries
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
        return {
          ...s,
          text: display,
          translated_text: display,
        };
      }));
      // Async translate all log items for target language so none remain in English
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

  // Auto-scroll ONLY internal AI chat container (never scrolls the window)
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
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

        // Handle kick message in real time
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
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
            if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
            setSessionStatus('OFFLINE');
            setConnectionState('failed');
            setHasVideo(false);
            setHasAudio(false);
            setSubtitles([]);
            return;
          }
        }

        // Handle session ended or teacher offline events
        if (message.type === 'lecture_ended' || message.type === 'session_ended') {
          setSessionStatus('ENDED');
          setConnectionState('disconnected');
          setHasVideo(false);
          setHasAudio(false);
          setSubtitles([]);
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
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

        if (message.type === 'teacher_online') {
          setIsTeacherAway(false);
          setConnectionState('connecting');
          if (!isKickedRef.current) {
            if (pcRef.current) {
              pcRef.current.ontrack = null;
              pcRef.current.onicecandidate = null;
              pcRef.current.onconnectionstatechange = null;
              pcRef.current.close();
              pcRef.current = null;
            }
            // Instantly request fresh offer from returning teacher with 0ms delay
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current, student_id: studentId,
              }));
            }
          }
          return;
        }

        if (message.type === 'language_change' && message.language) {
          // Teacher's language change does not force override student's own selected language
          return;
        }

        if (message.type === 'subtitle_translation' && message.text && message.translated_text) {
          const transLang = message.language;
          const transText = message.translated_text;
          const origText = (message.text || '').trim();
          if (transLang === targetLangRef.current && transText && transText !== origText) {
            setActiveSubtitleText(transText);
            if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
            subtitleClearTimerRef.current = setTimeout(() => {
              setActiveSubtitleText(null);
            }, 3000);

            setSubtitles((prev) => {
              const exists = prev.some(
                (item) => item.id === message.sub_id || (item.original_text && item.original_text.trim() === origText)
              );
              if (exists) {
                return prev.map((item) =>
                  item.id === message.sub_id || (item.original_text && item.original_text.trim() === origText)
                    ? { ...item, text: transText, translated_text: transText }
                    : item
                );
              }
              return [...prev.filter((s) => s.id !== message.sub_id && s.id < 999999000), {
                id: message.sub_id || Date.now(),
                speaker: 'Teacher',
                text: transText,
                original_text: origText,
                translated_text: transText,
                timestamp: new Date().toLocaleTimeString(),
              }];
            });
          }
          return;
        }

        if (message.type === 'subtitle' && message.subtitle) {
          const sub = message.subtitle;
          const currentLang = targetLangRef.current;
          const rawText = (sub.text || sub.original_text || '').trim();
          if (!rawText) return;

          const isInterim = Boolean(message.is_interim);
          const subId = sub.id || Date.now();

          // Out-of-order packet protection ONLY for interim speech in continuous stream
          if (isInterim && message.seq && message.seq < lastProcessedSubSeqRef.current && (lastProcessedSubSeqRef.current - message.seq < 500000)) {
            return;
          }
          if (message.seq) {
            lastProcessedSubSeqRef.current = message.seq;
          }

          lastRawEnglishSubtitleRef.current = rawText;
          setLiveSpeechText(rawText);

          // ── If student selected ENGLISH: ──────────────────────────────
          if (!currentLang || currentLang === 'en' || currentLang === 'english') {
            setActiveSubtitleText(rawText);
            if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
            subtitleClearTimerRef.current = setTimeout(() => {
              setActiveSubtitleText(null);
            }, 3000);

            if (!isInterim) {
              const newSub: LiveSubtitle = {
                id: subId,
                speaker: sub.speaker || 'Teacher',
                text: rawText,
                original_text: rawText,
                translated_text: rawText,
                translations: sub.translations,
                timestamp: sub.timestamp || new Date().toLocaleTimeString(),
              };
              setSubtitles((prev) => {
                const cleanPrev = prev.filter((s) => s.id !== subId && s.id < 999999000);
                return [...cleanPrev, newSub];
              });
            }
            return;
          }

          // ── If student selected NON-ENGLISH (e.g. Hindi, Telugu, Tamil, French, Spanish, etc.): ───
          // NEVER display raw English text to the student!
          let translatedText: string | null = null;
          if (sub.translations && sub.translations[currentLang] && sub.translations[currentLang] !== rawText) {
            translatedText = sub.translations[currentLang];
          } else if (sub.translated_text && sub.language === currentLang && sub.translated_text !== rawText) {
            translatedText = sub.translated_text;
          } else {
            const cached = getCachedTranslation(rawText, currentLang);
            if (cached && cached !== rawText) {
              translatedText = cached;
            } else {
              const draft = getOrDraftTranslation(rawText, currentLang);
              if (draft && draft !== rawText) {
                translatedText = draft;
              }
            }
          }

          if (translatedText) {
            setActiveSubtitleText(translatedText);
            if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
            subtitleClearTimerRef.current = setTimeout(() => {
              setActiveSubtitleText(null);
            }, 3000);

            if (!isInterim) {
              const newSub: LiveSubtitle = {
                id: subId,
                speaker: sub.speaker || 'Teacher',
                text: translatedText,
                original_text: sub.original_text || rawText,
                translated_text: translatedText,
                translations: sub.translations,
                timestamp: sub.timestamp || new Date().toLocaleTimeString(),
              };
              setSubtitles((prev) => {
                const cleanPrev = prev.filter((s) => s.id !== subId && s.id < 999999000);
                const existsIndex = cleanPrev.findIndex(
                  (s) => s.id === subId || (s.original_text && s.original_text.trim() === rawText)
                );
                if (existsIndex >= 0) {
                  const updated = [...cleanPrev];
                  updated[existsIndex] = {
                    ...updated[existsIndex],
                    text: translatedText!,
                    original_text: rawText,
                    translated_text: translatedText!,
                    translations: sub.translations || updated[existsIndex].translations,
                  };
                  return updated;
                }
                return [...cleanPrev, newSub];
              });
            }
          }

          // Trigger async neural translation to guarantee accurate translation in student's selected language
          translateClientTextAsync(rawText, currentLang).then((finalTrans) => {
            if (finalTrans && finalTrans !== rawText && targetLangRef.current === currentLang) {
              setActiveSubtitleText(finalTrans);
              if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
              subtitleClearTimerRef.current = setTimeout(() => {
                setActiveSubtitleText(null);
              }, 3000);

              if (!isInterim) {
                setSubtitles((prev) => {
                  const exists = prev.some(
                    (s) => s.id === subId || (s.original_text && s.original_text.trim() === rawText)
                  );
                  if (exists) {
                    return prev.map((item) =>
                      item.id === subId || (item.original_text && item.original_text.trim() === rawText)
                        ? { ...item, text: finalTrans, translated_text: finalTrans }
                        : item
                    );
                  }
                  const newSub: LiveSubtitle = {
                    id: subId,
                    speaker: sub.speaker || 'Teacher',
                    text: finalTrans,
                    original_text: rawText,
                    translated_text: finalTrans,
                    translations: sub.translations,
                    timestamp: sub.timestamp || new Date().toLocaleTimeString(),
                  };
                  return [...prev.filter((s) => s.id !== subId && s.id < 999999000), newSub];
                });
              }
            }
          }).catch(() => {});

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
            console.log('[Student] Remote track received:', trackEvent.track.kind, trackEvent.track.id);
            setIsTeacherAway(false);
            trackEvent.track.onunmute = () => {
              console.log('[Student] Remote track unmuted:', trackEvent.track.kind);
              setIsTeacherAway(false);
              if (trackEvent.track.kind === 'video') setHasVideo(true);
              if (trackEvent.track.kind === 'audio') setHasAudio(true);
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

          pc.onconnectionstatechange = () => {
            setConnectionState(pc.connectionState);
            if (pc.connectionState === 'connected') {
              setIsTeacherAway(false);
              setHasVideo(true);
            }
          };

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
      if (ws.readyState === WebSocket.OPEN && !isKickedRef.current) {
        const state = pcRef.current?.connectionState;
        if (!state || state === 'failed' || state === 'closed' || state === 'disconnected') {
          ws.send(JSON.stringify({
            type: 'request_offer', classroom_id: classroomId, peer_id: peerIdRef.current, student_id: studentId,
          }));
        }
      }
    }, 15000);
  }, [classroomId, attachStreamToElements, addToast, studentId]);

  // ─── Session Discovery & Multi-Classroom Stream Fetching ─────────────────
  useEffect(() => {
    if (isKickedRef.current) return;

    const fetchActiveSessions = async () => {
      if (isKickedRef.current) return;
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
    if (sessionId && !isKickedRef.current) {
      lectureApi.connectStudent({ session_id: sessionId, peer_id: peerIdRef.current }).catch((err) => {
        if (err.response?.status === 403) {
          isKickedRef.current = true;
          setIsKicked(true);
          setSessionStatus('OFFLINE');
          setConnectionState('failed');
          setHasVideo(false);
          setHasAudio(false);
          setSubtitles([]);
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
          if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
          addToast({
            type: 'error',
            title: 'Access Denied',
            description: 'You were removed from this lecture session and cannot rejoin.',
          });
        }
      });
    }
    return () => {
      if (sessionId && !isKickedRef.current) {
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
          const currentLang = targetLangRef.current;
          const formatted = res.data.map((s: any) => {
            const raw = (s.original_text || s.text || '').trim();
            let displayText = s.text;
            if (currentLang !== 'en' && raw) {
              if (s.translations && s.translations[currentLang] && s.translations[currentLang] !== raw) {
                displayText = s.translations[currentLang];
              } else if (s.translated_text && s.language === currentLang && s.translated_text !== raw) {
                displayText = s.translated_text;
              } else {
                const cached = getCachedTranslation(raw, currentLang) || getOrDraftTranslation(raw, currentLang);
                if (cached && cached !== raw) {
                  displayText = cached;
                } else {
                  translateClientTextAsync(raw, currentLang).then((t) => {
                    if (t && t !== raw && targetLangRef.current === currentLang) {
                      setSubtitles((prev) => prev.map((item) =>
                        item.id === s.id || (item.original_text && item.original_text.trim() === raw)
                          ? { ...item, text: t, translated_text: t }
                          : item
                      ));
                    }
                  }).catch(() => {});
                }
              }
            }
            return { ...s, text: displayText, original_text: raw, translated_text: displayText };
          });
          setSubtitles((prev) => {
            if (formatted.length === 0) return prev;
            const map = new Map<string, LiveSubtitle>();
            prev.forEach((s) => {
              const key = (s.original_text || s.text || '').trim();
              if (key) map.set(key, s);
            });
            formatted.forEach((s: LiveSubtitle) => {
              const key = (s.original_text || s.text || '').trim();
              if (key) {
                const existing = map.get(key);
                const preserveTranslated = (currentLang !== 'en' && existing && existing.text && existing.text !== key)
                  ? existing.text
                  : s.text;
                map.set(key, existing ? { ...existing, ...s, text: preserveTranslated, translated_text: preserveTranslated, translations: existing.translations || s.translations } : s);
              }
            });
            return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
          });
        }
      } catch {}
    };
    fetchSubs();
    const interval = setInterval(fetchSubs, 3000);
    return () => clearInterval(interval);
  }, [sessionId, sessionStatus, targetLang, teacherName]);

  // ─── Load AI Q&A history strictly per active session ─────────────────────
  useEffect(() => {
    if (!sessionId) {
      setAiMessages([]);
      setSummaryData(null);
      setShowSummary(false);
      return;
    }
    // Clean slate for new session: immediately clear old session's messages
    setAiMessages([]);
    setSummaryData(null);
    setShowSummary(false);

    aiQaApi.getQAHistory(sessionId).then((res) => {
      setAiMessages(res.data || []);
    }).catch(() => {
      setAiMessages([]);
    });
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

  // ─── Clear AI Q&A History ──────────────────────────────────────────────────
  const handleClearHistory = async () => {
    const confirmed = window.confirm(
      'Clear chat history? This will remove your current AI conversation.'
    );
    if (!confirmed) return;

    if (sessionId) {
      try {
        await aiQaApi.clearQAHistory(sessionId);
      } catch (e) {
        console.debug('Backend clear history notice:', e);
      }
    }
    setAiMessages([]);
    addToast({
      type: 'info',
      title: 'Chat History Cleared',
      description: 'Your current AI assistant conversation has been removed.',
    });
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
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Bar */}
      <Card variant="default" padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${sessionStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : sessionStatus === 'ENDED' ? 'bg-purple-500' : 'bg-rose-500'}`} />
          <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate tracking-tight">Live Classroom</h1>
          <Badge
            variant={sessionStatus === 'ACTIVE' ? 'success' : sessionStatus === 'ENDED' ? 'ai' : 'danger'}
            size="sm"
            dot
            pulse={sessionStatus === 'ACTIVE'}
          >
            {sessionStatus === 'ACTIVE'
              ? (sessionId ? `SESSION #${sessionId} • LIVE` : 'LIVE')
              : sessionStatus === 'ENDED'
              ? 'CLASS ENDED'
              : 'TEACHER OFFLINE'}
          </Badge>
          {sessionStatus === 'ACTIVE' && sessionSubject && (
            <Badge variant="brand" size="sm" className="truncate max-w-[200px] sm:max-w-none">
              {sessionSubject} {sessionTopic ? `— ${sessionTopic}` : ''}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${connBadge.color}`}>
            {connBadge.label}
          </span>

          {/* Audio Control */}
          <div className="flex items-center gap-2 bg-[#080c14] px-2.5 py-1 rounded-lg border border-[#1b2538]">
            <button
              onClick={toggleAudioMute}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                !isAudioMuted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              {!isAudioMuted ? (
                <><Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /><span>ON</span></>
              ) : (
                <><VolumeX className="w-3.5 h-3.5 text-rose-400" /><span>MUTED</span></>
              )}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={isAudioMuted ? 0 : audioVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <LanguageSelector
            selectedLanguage={targetLang}
            onLanguageChange={handleLanguageChange}
            size="sm"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            variant="default"
            padding="none"
            className="overflow-hidden relative bg-black h-64 sm:h-80 md:h-[440px] lg:h-[490px] w-full flex items-center justify-center rounded-2xl shadow-2xl cursor-pointer"
            onClick={() => isAudioMuted && hasAudio && handleUnmute()}
          >
            <video
              ref={videoRef} autoPlay playsInline muted={isAudioMuted}
              className={`w-full h-full object-cover transition-opacity duration-300 ${hasVideo && sessionStatus === 'ACTIVE' && !isTeacherAway ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
            />

            {isAudioMuted && sessionStatus === 'ACTIVE' && !isKicked && !isTeacherAway && (
              <button
                onClick={(e) => { e.stopPropagation(); handleUnmute(); }}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl animate-pulse text-[11px] sm:text-xs cursor-pointer pointer-events-auto"
              >
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tap to Unmute Audio
              </button>
            )}

            {isKicked ? (
              <div className="text-center space-y-4 z-10 p-6 max-w-md bg-[#080c14]/95 border border-rose-500/50 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/10">
                  <Shield className="w-7 h-7 text-rose-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                    Access Revoked
                  </span>
                  <h3 className="text-lg font-bold text-slate-100 mt-2.5 tracking-tight">Removed From Class</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You have been removed from this live lecture session by the educator.
                  </p>
                </div>
              </div>
            ) : sessionStatus === 'ENDED' || sessionStatus === 'OFFLINE' ? (
              <div className="text-center space-y-4 z-10 p-6 max-w-md bg-[#080c14]/90 border border-[#1b2538] rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-lg shadow-purple-500/10">
                  <VideoOff className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <Badge variant="ai" size="sm">
                    Class Ended
                  </Badge>
                  <h3 className="text-lg font-bold text-slate-100 mt-2.5 tracking-tight">Live Session Completed</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    This live classroom session has concluded. Check lecture artifacts or ask the AI assistant below for study notes.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (downloadsRef.current) downloadsRef.current.scrollIntoView({ behavior: 'smooth' });
                    }}
                    leftIcon={<Download className="w-3.5 h-3.5 text-sky-400" />}
                  >
                    Lecture Artifacts
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (aiInputRef.current) aiInputRef.current.focus();
                    }}
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Ask AI Question
                  </Button>
                </div>
              </div>
            ) : isTeacherAway && sessionStatus === 'ACTIVE' ? (
              /* Blurred Placeholder when Teacher Temporarily Steps Away */
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#080c14]/85 backdrop-blur-xl border border-amber-500/30 text-center animate-fade-in">
                <div className="relative mb-3">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/20">
                    <Radio className="w-7 h-7 animate-pulse text-amber-400" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                  </span>
                </div>

                <div className="max-w-md space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <Clock className="w-3 h-3" />
                    <span>Educator Stepped Away Temporarily</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                    Live Lecture in Progress
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                    The teacher is temporarily on another screen. Live class is active and video stream will resume automatically upon return.
                  </p>

                  <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Subtitles & AI doubts active</span>
                  </div>
                </div>
              </div>
            ) : (
              !hasVideo && (
                <div className="text-center space-y-3 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#0d131f] border border-[#1b2538] flex items-center justify-center text-sky-400 mx-auto">
                    <Video className="w-7 h-7 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
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
              <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsCcEnabled(!isCcEnabled); }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shadow-lg ${
                    isCcEnabled
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-yellow-500/10 hover:bg-yellow-500/30'
                      : 'bg-[#0d131f]/80 text-slate-400 border-[#1b2538] hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-black font-mono">CC</span>
                  <span className="text-[10px] uppercase font-bold">{isCcEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Subtitle Size */}
                <div className="flex items-center gap-0.5 backdrop-blur-md bg-[#0d131f]/80 rounded-lg border border-[#1b2538] p-0.5">
                  {(['sm', 'md', 'lg'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={(e) => { e.stopPropagation(); setSubtitleSize(size); }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                        subtitleSize === size ? 'bg-sky-500/30 text-sky-300' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>

                {/* Position Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSubtitlePosition(subtitlePosition === 'bottom' ? 'top' : 'bottom'); }}
                  className="backdrop-blur-md bg-[#0d131f]/80 rounded-lg border border-[#1b2538] p-1 text-slate-400 hover:text-white transition-all"
                  title="Toggle subtitle position"
                >
                  {subtitlePosition === 'bottom' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Netflix Style CC Subtitle Overlay */}
            {sessionStatus === 'ACTIVE' && isCcEnabled && activeSubtitleText && (
              <div className={`absolute ${subtitlePosition === 'top' ? 'top-14 sm:top-16' : 'bottom-6 sm:bottom-10'} left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-xl pointer-events-none transition-all duration-150 animate-fade-in px-1`}>
                <div className="bg-black/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-white/15 shadow-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 transition-all duration-150 text-center max-w-full">
                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-yellow-400 text-black font-mono shrink-0">
                    CC • {getLanguageByCode(targetLang)?.name?.toUpperCase() || targetLang.toUpperCase()}
                  </span>
                  <p className={`text-yellow-300 sm:text-yellow-200 font-extrabold ${subtitleSizeClass} leading-snug tracking-wide drop-shadow-md break-words max-w-full`}>
                    {activeSubtitleText}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Audio Element (hidden) */}
          <audio ref={audioRef} autoPlay playsInline muted={isAudioMuted} className="hidden" />

          {/* Automatic AI Visual Learning Engine (Auto-Synced with Teacher Speech) */}
          <div className="h-[380px] sm:h-[480px]">
            <VisualLearningEngine
              liveTranscript={
                liveSpeechText ||
                (subtitles.length > 0
                  ? subtitles.map((s) => s.original_text || s.text).slice(-4).join(' ')
                  : sessionTopic || '')
              }
              fullTranscript={subtitles.map((s) => s.original_text || s.text).join(' ')}
              currentTopic={sessionTopic || 'Water Cycle'}
              subject={sessionSubject || 'Science'}
              targetLang={targetLang}
              onAskAboutNode={(label) => {
                setAiQuestion(`Can you explain ${label} in detail?`);
                if (aiInputRef.current) aiInputRef.current.focus();
              }}
            />
          </div>

          {/* Auto-Read Toggle */}
          <Card variant="default" padding="sm" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200">Auto-Read Subtitles (TTS)</span>
            </div>
            <button
              onClick={() => setAutoReadSubtitles((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoReadSubtitles ? 'bg-sky-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoReadSubtitles ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </Card>

          {/* Transcript Log */}
          <Card variant="default" className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
                <Volume2 className="w-4 h-4 text-sky-400" /> Live Transcript
              </h3>
              <Badge variant="neutral" size="sm">
                {subtitles.length} entries
              </Badge>
            </div>
            <div ref={subtitleContainerRef} className="space-y-2 max-h-60 overflow-y-auto">
              {subtitles.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Waiting for teacher to speak...</p>
              ) : (
                subtitles.map((sub) => {
                  const raw = (sub.original_text || sub.text || '').trim();
                  let displayText = sub.text;
                  if (targetLang !== 'en' && raw) {
                    if (sub.translations && sub.translations[targetLang] && sub.translations[targetLang] !== raw) {
                      displayText = sub.translations[targetLang];
                    } else if (sub.translated_text && sub.translated_text !== raw) {
                      displayText = sub.translated_text;
                    } else {
                      const cached = getCachedTranslation(raw, targetLang) || getOrDraftTranslation(raw, targetLang);
                      if (cached && cached !== raw) {
                        displayText = cached;
                      }
                    }
                  }
                  return (
                    <div key={sub.id} className="p-2.5 rounded-lg bg-[#080c14] border border-[#1b2538] text-xs break-words max-w-full">
                      <span className="font-bold text-sky-400 font-mono text-[11px] shrink-0">{sub.speaker}: </span>
                      <span className="text-slate-200 break-words leading-relaxed">{displayText}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Summarize Button */}
          <Card variant="ai" className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-indigo-300 text-sm flex items-center gap-2 tracking-tight">
                  <Brain className="w-4 h-4" /> AI Lecture Summary
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Generate an AI-powered summary of this lecture</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={summaryStyle}
                  onChange={(e) => setSummaryStyle(e.target.value)}
                  className="bg-[#080c14] border border-[#1b2538] rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="study_notes">Study Notes</option>
                  <option value="bullet_points">Bullet Points</option>
                </select>
                <Button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  isLoading={isSummarizing}
                  variant="primary"
                  size="sm"
                  leftIcon={<Brain className="w-3.5 h-3.5" />}
                >
                  {isSummarizing ? 'Generating...' : 'Summarize'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: AI Chat, Raise Hand, Downloads */}
        <div className="space-y-6">
          {/* AI Q&A Chat Panel */}
          <Card variant="default" className="space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-xs sm:text-sm tracking-tight">
                    AI Classroom Assistant
                  </h3>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Doubt Solver
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aiMessages.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    title="Clear chat history"
                    className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAiChat(!showAiChat)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {showAiChat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showAiChat && (
              <>
                {/* Chat Messages Container */}
                <div ref={chatScrollContainerRef} className="space-y-3.5 max-h-72 overflow-y-auto px-1 pr-1.5">
                  {aiMessages.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-300 font-semibold">How can I help you in this class?</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Ask about lecture concepts, formulas, derivations, or step-by-step problem solving.
                      </p>
                    </div>
                  ) : (
                    aiMessages.map((msg) => (
                      <div key={msg.id} className="space-y-2 animate-fade-in">
                        {/* Student question */}
                        <div className="flex justify-end items-start gap-2">
                          <div className="max-w-[85%] bg-sky-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs shadow-md">
                            {msg.question}
                          </div>
                        </div>

                        {/* AI answer */}
                        {msg.answer ? (
                          <div className="flex justify-start items-start gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 shadow-sm">
                              AI
                            </div>
                            <div className="max-w-[88%] bg-[#080c14] border border-[#1b2538] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-200 shadow-lg space-y-1">
                              <div className="text-[9px] font-bold text-sky-400 uppercase tracking-wider font-mono">
                                ClassAbly AI
                              </div>
                              <div className="whitespace-pre-wrap leading-relaxed">
                                {msg.answer}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-start items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
                              AI
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-sky-300 font-medium py-1.5 px-3 bg-[#080c14] border border-[#1b2538] rounded-2xl">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-75" />
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse delay-150" />
                              <span className="ml-1 text-[11px] text-slate-400">AI Assistant is thinking...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={aiChatEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#1b2538]">
                  {[
                    'Key Concept',
                    'Step-by-Step Derivation',
                    'Core Formula',
                    'Example Problem',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setAiQuestion(chip)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#080c14] hover:bg-sky-500/15 text-slate-300 hover:text-sky-300 border border-[#1b2538] transition-all cursor-pointer font-medium"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* AI Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    ref={aiInputRef}
                    type="text"
                    placeholder="Message AI Assistant..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                    className="input-field text-xs flex-1"
                    disabled={isAiLoading}
                  />
                  <Button
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || isAiLoading}
                    variant="primary"
                    size="sm"
                    className="px-3"
                  >
                    {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* Raise Hand Panel */}
          <Card variant="default" className="space-y-3.5">
            <h3 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2 tracking-tight">
              <Hand className="w-4 h-4 text-amber-400" /> Raise Hand / Ask Teacher
            </h3>

            {/* Category Selector */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'doubt', label: 'Doubt' },
                { value: 'clarification', label: 'Clarification' },
                { value: 'example', label: 'Example' },
                { value: 'other', label: 'Other' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setQuestionCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    questionCategory === cat.value
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-[#080c14] text-slate-400 border border-[#1b2538] hover:text-slate-200'
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
                className="input-field text-xs resize-none"
              />
              <span className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono">
                {questionText.length}/500
              </span>
            </div>

            <Button
              onClick={handleRaiseHand}
              variant="primary"
              size="sm"
              className="w-full"
              disabled={isHandRaised}
              leftIcon={<Hand className="w-3.5 h-3.5" />}
            >
              {isHandRaised ? 'Hand Raised' : 'Raise Hand'}
            </Button>

            {isHandRaised && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
          </Card>

          {/* Downloads */}
          <Card ref={downloadsRef} id="recordings-section" variant="default" className="space-y-3">
            <h3 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2 tracking-tight">
              <Download className="w-4 h-4 text-sky-400" /> Lecture Downloads & Recordings
            </h3>

            {sessionId ? (
              <div className="space-y-2">
                <a href={exportApi.downloadTranscriptUrl(sessionId)} download className="btn-secondary w-full text-xs justify-between">
                  <span>Transcript (TXT)</span>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </a>
                <a href={exportApi.downloadSubtitlesUrl(sessionId)} download className="btn-secondary w-full text-xs justify-between">
                  <span>Subtitles (VTT)</span>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </a>
                <a href={exportApi.downloadSummaryUrl(sessionId)} download className="btn-secondary w-full text-xs justify-between text-purple-400 border-purple-500/30">
                  <span>PDF Summary</span>
                  <Download className="w-3.5 h-3.5" />
                </a>
                <a href={exportApi.downloadAudioUrl(sessionId)} download className="btn-secondary w-full text-xs justify-between text-emerald-400 border-emerald-500/30">
                  <span>Audio Recording (WEBM/MP3)</span>
                  <Download className="w-3.5 h-3.5" />
                </a>
                <a href={exportApi.downloadRecordingUrl(sessionId)} download className="btn-secondary w-full text-xs justify-between text-sky-400 border-sky-500/30">
                  <span>Video Recording (WEBM/MP4)</span>
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No active class session recordings available.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={showSummary && !!summaryData}
        onClose={() => setShowSummary(false)}
        title="AI Lecture Summary"
        description={summaryData ? `Style: ${summaryData.style} • Generated ${summaryData.created_at}` : ''}
        size="lg"
      >
        {summaryData && (
          <div className="space-y-4">
            <div className="bg-[#080c14] border border-[#1b2538] rounded-xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {summaryData.summary_text}
            </div>

            {(summaryData.key_points || []).length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Key Points
                </h4>
                <ul className="space-y-1.5">
                  {(summaryData.key_points || []).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(summaryData.definitions || []).length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-sky-400 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Definitions
                </h4>
                <div className="space-y-1.5">
                  {(summaryData.definitions || []).map((d, i) => (
                    <div key={i} className="text-xs text-slate-300 bg-[#080c14] p-2 rounded-lg border border-[#1b2538]">{d}</div>
                  ))}
                </div>
              </div>
            )}

            {(summaryData.formulas || []).length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Formulas
                </h4>
                <div className="space-y-1.5">
                  {(summaryData.formulas || []).map((f, i) => (
                    <div key={i} className="text-xs text-amber-200 font-mono bg-[#080c14] p-2 rounded-lg border border-amber-500/20">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
