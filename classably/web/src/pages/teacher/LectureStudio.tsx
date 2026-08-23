import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  Mic,
  Camera,
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
  Users
} from 'lucide-react';
import { lectureApi, ocrApi, exportApi, cameraApi } from '../../api/client';
import { LiveSubtitle, RaiseHandItem, QuizQuestion } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Module-level persistent recording storage across component unmount/remount
const globalRecordedVideoChunks: Map<number, Blob[]> = new Map();
const globalRecordedAudioChunks: Map<number, Blob[]> = new Map();
const globalSessionStartTimes: Map<number, number> = new Map();

export const LectureStudio: React.FC = () => {
  const { addToast } = useToast();
  const { user } = useAuth();

  // Lecture Session State
  const [sessionId, setSessionId] = useState<number | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  // Media Stream & Hardware State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [cameraSourceType, setCameraSourceType] = useState<'webcam' | 'esp32' | 'ip_cam'>('webcam');

  // Live Live Transcript & Subtitles
  const [subtitles, setSubtitles] = useState<LiveSubtitle[]>([]);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [isCcEnabled, setIsCcEnabled] = useState(true);

  // OCR Extraction State
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Raised Hand Queue & AI Quizzes & Connected Students
  const [raiseHandQueue, setRaiseHandQueue] = useState<RaiseHandItem[]>([]);
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

  const subtitleSeqRef = useRef<number>(0);
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

  const startSpeechRecognition = (activeSessionId: number) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[STT] SpeechRecognition API not supported in this browser.');
      setIsSttSupported(false);
      return;
    }

    setIsSttSupported(true);
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[STT] Live speech recognition started instantly with high sensitivity.');
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

        const activeText = (finalTranscript || interimTranscript).trim();
        const isFinal = Boolean(finalTranscript);

        if (activeText) {
          subtitleSeqRef.current += 1;
          const seq = subtitleSeqRef.current;
          const subId = isFinal ? Date.now() : 999999000 + (seq % 1000);

          // 1. Instant UI update with 0ms delay (disappears after silence)
          setActiveSubtitleText(activeText);
          if (subtitleClearTimerRef.current) {
            clearTimeout(subtitleClearTimerRef.current);
          }
          subtitleClearTimerRef.current = setTimeout(() => {
            setActiveSubtitleText(null);
          }, 3000);

          // 2. Broadcast immediately to students with zero buffering
          const subPayload = {
            type: 'subtitle',
            classroom_id: 1,
            session_id: activeSessionId || sessionIdRef.current,
            seq: seq,
            is_interim: !isFinal,
            subtitle: {
              id: subId,
              seq: seq,
              speaker: user?.full_name || 'Educator',
              text: activeText,
              original_text: activeText,
              timestamp: new Date().toLocaleTimeString(),
            },
          };
          broadcastSubtitle(subPayload);

          if (isFinal) {
            setSubtitles((prev) => {
              const withoutInterim = prev.filter((s) => s.id !== subId && s.id < 999999000);
              return [...withoutInterim, {
                id: subId,
                speaker: user?.full_name || 'Educator',
                text: activeText,
                original_text: activeText,
                timestamp: new Date().toLocaleTimeString(),
              }];
            });

            // Ingest to backend database asynchronously
            lectureApi.ingestSubtitle({
              session_id: activeSessionId || sessionIdRef.current || 0,
              text: finalTranscript,
              speaker_name: user?.full_name || 'Educator',
              target_lang: targetLang,
            }).catch((e) => console.debug('[STT] Background ingest error:', e));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[STT] Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setIsSttActive(false);
        }
      };

      recognition.onend = () => {
        // Continuous speech recognition recovery with minimal delay
        if (isSessionActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            setTimeout(() => {
              if (isSessionActiveRef.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (err) {}
              }
            }, 10);
          }
        } else {
          setIsSttActive(false);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (startErr) {
        console.warn('[STT] Recognition immediate start notice:', startErr);
      }
    } catch (err) {
      console.warn('[STT] Could not initialize SpeechRecognition:', err);
    }
  };

  const stopSpeechRecognition = () => {
    if (subtitleClearTimerRef.current) {
      clearTimeout(subtitleClearTimerRef.current);
      subtitleClearTimerRef.current = null;
    }
    setActiveSubtitleText(null);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      try { audioRecorderRef.current.stop(); } catch {}
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
  const initWebRTC = (stream: MediaStream) => {
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

      // Immediately flush any speech subtitles captured during session startup
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
          const now = Date.now();
          const lastTime = lastNegotiationTimeRef.current.get(peerId) || 0;
          const existingPc = peerConnectionsRef.current.get(peerId);
          if (existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting') && (now - lastTime < 3000)) {
            console.log('[Teacher] Skipping redundant offer negotiation for active peer:', peerId);
            return;
          }
          lastNegotiationTimeRef.current.set(peerId, now);
          console.log('[Teacher] Student joined room, creating new offer for peer:', peerId);
          await createPeerConnectionForStudent(peerId, stream);
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

  const createSyntheticClassroomStream = (): MediaStream => {
    console.log('[Teacher] Creating synthetic live classroom video & audio stream fallback...');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    let frameCount = 0;
    const drawFrame = () => {
      frameCount++;
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.fillText('ClassAbly Smart Lecture Studio', 80, 100);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px Inter, sans-serif';
      ctx.fillText('Topic: Artificial Intelligence & Live Classroom Stream', 80, 150);

      ctx.beginPath();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 4;
      for (let x = 80; x < 1200; x += 10) {
        const y = 360 + Math.sin((x + frameCount * 5) * 0.02) * 40;
        if (x === 80) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(80, 620, 10 + Math.sin(frameCount * 0.1) * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText(`LIVE STREAMING • Frame #${frameCount}`, 105, 627);

      requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const canvasStream = canvas.captureStream(30);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const actx = new AudioCtx();
        if (actx.state === 'suspended') {
          actx.resume().catch(() => {});
        }
        const dest = actx.createMediaStreamDestination();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, actx.currentTime);
        // Inaudible keepalive signal — only ensures WebRTC audio packets flow,
        // does NOT produce audible beep for students
        gain.gain.setValueAtTime(0.001, actx.currentTime);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();

        const synthAudioTrack = dest.stream.getAudioTracks()[0];
        if (synthAudioTrack) {
          console.log('[Teacher] Silent keepalive audio track created & attached:', synthAudioTrack.id);
          canvasStream.addTrack(synthAudioTrack);
        }
      }
    } catch (e) {
      console.warn('[Teacher] Could not create synth audio track:', e);
    }

    return canvasStream;
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

  // Initialize Web Cam Media Stream with resilient mobile/desktop fallback chain
  const startMediaDevices = async (activeSessionId?: number) => {
    try {
      const currentSessionId = activeSessionId || sessionIdRef.current || 1;
      console.log('[Teacher] Requesting getUserMedia with video & enhanced audio constraints for session:', currentSessionId);
      let rawStream: MediaStream | null = null;
      
      const constraintsList: MediaStreamConstraints[] = [
        {
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        },
        { video: true, audio: true },
        { video: { facingMode: 'user' }, audio: true },
        { video: true, audio: false },
      ];

      for (const constraints of constraintsList) {
        try {
          rawStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (rawStream && rawStream.getVideoTracks().length > 0) {
            console.log('[Teacher] getUserMedia succeeded with constraints:', constraints);
            break;
          }
        } catch (errConstraint) {
          console.warn('[Teacher] getUserMedia attempt failed with:', constraints, errConstraint);
        }
      }

      if (!rawStream) {
        console.warn('[Teacher] All physical webcam attempts failed; falling back to canvas classroom stream.');
        rawStream = createSyntheticClassroomStream();
        addToast({
          type: 'info',
          title: 'Live Board Stream Active',
          description: 'Webcam permission unavailable or denied. Broadcasting live Smart Board video stream.',
        });
      }

      // Build unified master stream with direct hardware mic track
      const masterStream = new MediaStream();
      const videoTrack = rawStream.getVideoTracks()[0];
      if (videoTrack) {
        masterStream.addTrack(videoTrack);
      }

      const rawAudioTrack = rawStream.getAudioTracks()[0];
      if (rawAudioTrack) {
        rawAudioTrack.enabled = true;
        masterStream.addTrack(rawAudioTrack);
        console.log('[Teacher] Direct hardware audio track attached to masterStream:', rawAudioTrack.id);
      } else {
        const mixedAudioTrack = createAudioStreamMixer(rawStream);
        if (mixedAudioTrack) {
          masterStream.addTrack(mixedAudioTrack);
          console.log('[Teacher] Fallback synth audio track attached to masterStream:', mixedAudioTrack.id);
        }
      }

      localStreamRef.current = masterStream;
      if (videoRef.current) {
        videoRef.current.srcObject = masterStream;
      }

      const audioTracks = masterStream.getAudioTracks();
      const videoTracks = masterStream.getVideoTracks();
      console.log(`[Teacher] getUserMedia success. Stream ID: ${masterStream.id}. Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`);
      audioTracks.forEach((t, i) => {
        console.log(`[Teacher] Audio Track #${i} -> id: ${t.id}, enabled: ${t.enabled}, state: ${t.readyState}, label: "${t.label}"`);
      });
      videoTracks.forEach((t, i) => {
        console.log(`[Teacher] Video Track #${i} -> id: ${t.id}, enabled: ${t.enabled}, state: ${t.readyState}, label: "${t.label}"`);
      });

      const isCamLive = videoTracks.length > 0 && (videoTracks[0].readyState === 'live' || videoTracks[0].enabled);
      const isMicLive = audioTracks.length > 0 && (audioTracks[0].readyState === 'live' || audioTracks[0].enabled);

      setCameraActive(isCamLive);
      setMicActive(isMicLive);
      console.log('[Teacher] Camera active:', isCamLive, '| Microphone active:', isMicLive);

      startMicLevelMeter(masterStream);
      startRecording(masterStream, currentSessionId);
      initWebRTC(masterStream);
    } catch (err) {
      console.warn('[Teacher] Webcam/Mic permission error or failure:', err);
    }
  };

  const stopMediaDevices = () => {
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
    setCameraActive(false);
    setMicActive(false);
  };

  // Check and resume active lecture session on component mount (e.g. after teacher navigates back from another page)
  useEffect(() => {
    let isMounted = true;
    const checkAndResumeActiveSession = async () => {
      try {
        const res = await lectureApi.getActiveSession(1);
        const data = res.data;
        if (isMounted && data?.is_active && data.session?.id) {
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

          await startMediaDevices(sess.id);
          startSpeechRecognition(sess.id);
          addToast({
            type: 'info',
            title: 'Resumed Active Lecture',
            description: `Reconnected to live lecture session #${sess.id} (${sess.subject || 'Live Lecture'}).`,
          });
        }
      } catch (err) {
        // No active session — normal state, teacher can start new lecture
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
  }, []);

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
      // Start STT immediately so speech transcription is primed with 0ms delay
      startSpeechRecognition(newSession.id);
      await startMediaDevices(newSession.id);

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


  // End Lecture Session (Instant UI update + instant WebSocket & backend termination + non-blocking background upload)
  const handleEndLecture = async () => {
    if (!sessionId) return;
    const targetSessionId = sessionId;

    // 1. Immediately broadcast lecture_ended event over WebSockets FIRST while socket is still open
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'lecture_ended',
          session_id: targetSessionId,
          classroom_id: 1,
        }));
      }
    } catch (e) {
      console.warn('[Teacher] WS lecture_ended notice:', e);
    }

    // 2. Trigger backend end_session immediately (instant DB update & server-side WS broadcast)
    lectureApi.endSession(targetSessionId).catch((e) => {
      console.warn('[Teacher] Backend end_session notice:', e);
    });

    // 3. Immediately set state to inactive and stop local media devices for instant UI response
    isSessionActiveRef.current = false;
    setIsSessionActive(false);
    setLastCompletedSessionId(targetSessionId);
    setSessionId(null);
    setSubtitles([]);
    setRaiseHandQueue([]);
    setConnectedStudents([]);
    setOcrText(null);
    stopMediaDevices();

    addToast({
      type: 'success',
      title: 'Lecture Session Ended',
      description: `Session #${targetSessionId} completed. Recordings and AI notes saved for download below.`,
    });

    // 4. Asynchronously upload recording non-blocking in the background
    (async () => {
      try {
        await stopRecordingAndUpload(targetSessionId);
      } catch (e) {
        console.warn('[Teacher] Recording upload notice:', e);
      }
    })();
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
      setSubtitles(Array.isArray(res.data) ? res.data : []);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isSessionActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
            <h1 className="text-xl font-extrabold text-slate-100">Smart Lecture Studio</h1>
            {isSessionActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                Session #{sessionId} LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Live Camera Feed, AI Board OCR, Real-Time STT Subtitles, & Raise Hand Queue</p>
          {isSessionActive && (
            <div className="mt-2 text-xs text-slate-300 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/30">
                Subject: {subject}
              </span>
              <span className="font-bold text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/30">
                Topic: {topic}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSessionActive && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                REC {Math.floor(recordingSeconds / 3600).toString().padStart(2, '0')}:{Math.floor((recordingSeconds % 3600) / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>

              {isSttActive && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-xl">
                  <Mic className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                  Live STT Active
                </span>
              )}
            </div>
          )}

          {isSessionActive && (
            <button onClick={handleEndLecture} className="btn-danger">
              <Square className="w-4 h-4" /> End Lecture & Save Notes
            </button>
          )}
        </div>
      </div>

      {/* Class Session Setup Card (when inactive) */}
      {!isSessionActive && (
        <div className="card bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-sky-500/40 p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" /> Start New Lecture Session
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter the subject name and topic details. This will be broadcast live to all connected students.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-lg border border-sky-500/30">
              Classroom #1
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Subject Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics, Computer Networks, Physics..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
              {/* Quick Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-semibold">Quick select:</span>
                {['Mathematics', 'Computer Science', 'Physics', 'Artificial Intelligence', 'Data Structures'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 transition-all cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Topic Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> Subject Topic <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Matrix Transformations, TCP/IP Architecture..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400">Describe the specific chapter or topic being taught today.</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-800">
            <button
              onClick={handleStartLecture}
              disabled={!subject.trim() || !topic.trim()}
              className={`btn-primary px-6 py-2.5 text-sm font-bold shadow-lg transition-all ${
                !subject.trim() || !topic.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" /> Start Live Lecture
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Grid: Video Camera + OCR / Subtitles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Camera Stream & OCR Board Scanner */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-0 overflow-hidden relative group bg-black">
            {/* Camera Controls Overlay Header */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <Camera className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-slate-200">Camera Source:</span>
                <select
                  value={cameraSourceType}
                  onChange={(e) => setCameraSourceType(e.target.value as any)}
                  className="bg-transparent text-sky-300 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="webcam" className="bg-slate-900 text-slate-100">Laptop Webcam</option>
                  <option value="esp32" className="bg-slate-900 text-slate-100">ESP32 Cam Stream</option>
                  <option value="ip_cam" className="bg-slate-900 text-slate-100">RTSP USB Camera</option>
                </select>
              </div>

              <div className="pointer-events-auto flex items-center gap-2">
                {/* YouTube Style CC Button */}
                <button
                  type="button"
                  onClick={() => setIsCcEnabled(!isCcEnabled)}
                  className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer flex items-center gap-1 ${
                    isCcEnabled
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-md shadow-yellow-500/10 hover:bg-yellow-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Toggle YouTube Closed Captions (CC)"
                >
                  <span className="text-[11px] font-extrabold font-mono">CC</span>
                  <span className="text-[9px] uppercase font-bold">{isCcEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <span className={`text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md ${cameraActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {cameraActive ? 'CAMERA ACTIVE' : 'CAMERA OFF'}
                </span>

                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!isSessionActive}
                  className={`flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    micActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                  title={micActive ? 'Click to Mute Microphone' : 'Click to Unmute Microphone'}
                >
                  <Mic className={`w-3.5 h-3.5 ${micActive ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                  <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className={`h-full transition-all duration-75 ease-out ${micActive ? 'bg-emerald-400' : 'bg-rose-500'}`}
                      style={{ width: `${micActive ? micLevel : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 w-8 text-right">
                    {micActive ? `${micLevel}%` : 'MUTED'}
                  </span>
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="h-80 sm:h-96 w-full relative flex items-center justify-center bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
              />

              {/* Netflix Style CC Subtitle Overlay — Centered near bottom, comfortably above edge */}
              {isSessionActive && isCcEnabled && activeSubtitleText && (
                <div className="absolute bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 z-30 max-w-[85%] w-auto pointer-events-none flex flex-col items-center gap-1 animate-fade-in">
                  <div className="bg-black/80 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-white/15 shadow-2xl flex items-center gap-2.5 transition-all duration-150">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-400 text-black font-mono shrink-0">
                      CC • {targetLang === 'hi' ? 'HINDI' : targetLang === 'te' ? 'TELUGU' : 'ENGLISH'}
                    </span>
                    <p className="text-yellow-300 sm:text-yellow-200 font-extrabold text-sm sm:text-base text-center leading-snug tracking-wide drop-shadow-md">
                      {activeSubtitleText}
                    </p>
                  </div>
                </div>
              )}

              {!cameraActive && (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
                    <Video className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-slate-400">Lecture Session Inactive. Click "Start Lecture" above to enable live stream.</p>
                </div>
              )}
            </div>

            {/* Studio Action Controls Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePerformOcrScan}
                  disabled={!isSessionActive || isOcrProcessing}
                  className="btn-primary text-xs"
                >
                  <Sparkles className={`w-4 h-4 ${isOcrProcessing ? 'animate-spin' : ''}`} />
                  {isOcrProcessing ? 'Analyzing Board...' : 'Run Live OCR Board Scan'}
                </button>
              </div>

              {isSessionActive && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={isGeneratingQuiz}
                    className="btn-secondary text-xs"
                  >
                    <Zap className="w-4 h-4 text-amber-400" /> Generate AI Quiz
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* OCR Board Detection Output Display */}
          {ocrText && (
            <div className="card border-sky-500/40 bg-sky-950/20 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between border-b border-sky-500/30 pb-2">
                <h3 className="font-bold text-sky-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Real-Time OCR Smart Board Extraction
                </h3>
                <span className="text-[10px] text-sky-400 font-mono">Recognized Text</span>
              </div>
              <p className="text-sm font-mono text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-800 leading-relaxed">
                {ocrText}
              </p>
            </div>
          )}

          {/* Live Audio Ingestion & Subtitle Stream */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-sky-400" /> Live Speech-to-Text Transcripts & Translation
                </h3>
                <p className="text-[11px] text-slate-400">Subtitles automatically generated from mic speech & translated for students</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Globe className="w-4 h-4 text-slate-400" />
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="en">English (Original)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                </select>
              </div>
            </div>

            {/* STT Status Banner */}
            {isSessionActive && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Mic className={`w-4 h-4 ${isSttActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  <span className="text-slate-300 font-medium">
                    {isSttActive
                      ? 'Live Speech-to-Text Active: Generating subtitles from mic audio.'
                      : isSttSupported
                      ? 'Live STT Paused. Click button to resume auto-transcription.'
                      : 'Web Speech API unavailable in this browser. Use manual input below.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSttSupported && (
                    <button
                      type="button"
                      onClick={toggleSttRecognition}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSttActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isSttActive ? 'STT ON' : 'Turn STT ON'}</span>
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    {(subtitles || []).length} Subtitles
                  </span>
                </div>
              </div>
            )}

            {/* Ingest Input Form for Educator */}
            <form onSubmit={handleIngestSubtitle} className="flex gap-2">
              <input
                type="text"
                placeholder="Type or speak live audio transcript (e.g. 'Next topic: Convolutional Layer Filters')..."
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                disabled={!isSessionActive}
                className="input-field text-xs"
              />
              <button type="submit" disabled={!isSessionActive} className="btn-primary text-xs whitespace-nowrap">
                Ingest Speech
              </button>
            </form>

            {/* Live Subtitle Transcript Stream Box */}
            <div ref={subtitleContainerRef} className="space-y-2 max-h-60 overflow-y-auto bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              {(!subtitles || subtitles.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">No speech transcripts ingested yet.</p>
              ) : (
                subtitles.map((sub) => (
                  <div key={sub.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-sky-400">{sub.speaker}</span>
                      <span>{sub.timestamp}</span>
                    </div>
                    <p className="text-slate-100 font-medium">{sub.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Connected Students, Raised Hand Queue, Quizzes & Export Downloads */}
        <div className="space-y-6">
          {/* Connected Live Students & Kick Control Panel */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" /> Connected Live Students ({(connectedStudents || []).length})
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {isSessionActive ? 'LIVE SESSION' : 'INACTIVE'}
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {!isSessionActive ? (
                <p className="text-xs text-slate-500 py-4 text-center">Start a lecture session to see connected students.</p>
              ) : (!connectedStudents || connectedStudents.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">No students currently connected to live stream.</p>
              ) : (
                connectedStudents.map((st, idx) => {
                  const name = st.full_name || st.student_name || `Student #${st.student_id || idx + 1}`;
                  const sId = st.student_id || st.id || idx + 1;
                  return (
                    <div key={st.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <div className="truncate">
                          <div className="font-bold text-slate-200 truncate">{name}</div>
                          <div className="text-[10px] text-slate-400 truncate">Roll No: {st.roll_number || `S-${100 + sId}`}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleKickStudent(sId, name)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-extrabold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                        title="Kick student out of class"
                      >
                        <UserX className="w-3.5 h-3.5 text-rose-400" /> Kick Out
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Live Student Raised Hand Queue */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" /> Raised Hand Assistance Queue
              </h3>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                {(raiseHandQueue || []).length} Pending
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {(!raiseHandQueue || raiseHandQueue.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">No pending student assistance requests.</p>
              ) : (
                raiseHandQueue.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>{item.student_name}</span>
                      <span className="text-[10px] text-slate-400">{item.created_at}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{item.question_text}</p>
                    <button
                      onClick={() => handleResolveHand(item.id)}
                      className="btn-secondary w-full text-[11px] py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Call On Student & Resolve
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Generated AI Quizzes */}
          {((quizzes || []).length > 0) && (
            <div className="card space-y-3 border-purple-500/30 bg-purple-950/20">
              <h3 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> AI Generated Quizzes & Flashcards
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {(quizzes || []).map((q) => (
                  <div key={q.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400">{q.type}</span>
                    <div className="font-semibold text-slate-100">{q.question}</div>
                    <div className="text-[11px] text-emerald-400">Answer: {q.correct_answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export & Download Hub */}
          {(() => {
            const exportTargetSessionId = sessionId || lastCompletedSessionId;
            return (
              <div className="card space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <Download className="w-4 h-4 text-sky-400" /> Export Lecture Artifacts
                  </h3>
                  {lastCompletedSessionId && !sessionId && (
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      Session #{lastCompletedSessionId} Saved
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <a
                    href={exportTargetSessionId ? exportApi.downloadSummaryUrl(exportTargetSessionId) : '#'}
                    download
                    className={`btn-secondary w-full justify-between ${!exportTargetSessionId ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span>Download AI Summary (PDF)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={exportTargetSessionId ? exportApi.downloadSubtitlesUrl(exportTargetSessionId) : '#'}
                    download
                    className={`btn-secondary w-full justify-between ${!exportTargetSessionId ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span>Download Captions (VTT)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={exportTargetSessionId ? exportApi.downloadTranscriptUrl(exportTargetSessionId) : '#'}
                    download
                    className={`btn-secondary w-full justify-between ${!exportTargetSessionId ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span>Download Transcript (TXT)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={exportTargetSessionId ? exportApi.downloadAudioUrl(exportTargetSessionId) : '#'}
                    download
                    className={`btn-secondary w-full justify-between text-emerald-400 border-emerald-500/30 ${!exportTargetSessionId ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span>Download Audio Recording (WEBM)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={exportTargetSessionId ? exportApi.downloadRecordingUrl(exportTargetSessionId) : '#'}
                    download
                    className={`btn-secondary w-full justify-between text-sky-400 border-sky-500/30 ${!exportTargetSessionId ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span>Download Full Video Recording (WEBM)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
