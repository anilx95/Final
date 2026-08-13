import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Cpu, Send, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { voiceApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';

export const VoiceAssistantStudio: React.FC = () => {
  const { addToast } = useToast();
  const { speakText } = useAccessibility();
  const { user } = useAuth();

  const studentId = user?.id || 1;
  const classroomId = user?.classroom_id || 1;

  const [commandText, setCommandText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await voiceApi.getHistory(studentId);
      setVoiceHistory(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchHistory();
  }, [studentId]);

  const handleSendCommand = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setIsExecuting(true);
    try {
      const res = await voiceApi.sendCommand({
        student_id: studentId,
        classroom_id: classroomId,
        text: textToSend,
      });

      const { intent, matched, device_result } = res.data;
      if (matched) {
        addToast({
          type: 'success',
          title: 'Voice Command Executed',
          description: `Intent detected: ${intent.toUpperCase()}. Smart classroom device updated.`,
        });
        speakText(`Command executed. Action: ${intent.replace('_', ' ')}.`);
      } else {
        addToast({
          type: 'warning',
          title: 'Intent Not Recognized',
          description: `Received text: "${textToSend}". Try saying 'Turn on lights' or 'Call teacher'.`,
        });
      }

      setCommandText('');
      fetchHistory();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Execution Error',
        description: 'Failed to process voice command with backend.',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Speech Recognition API Integration
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      addToast({
        type: 'warning',
        title: 'Speech Recognition Unavailable',
        description: 'Web Speech API is not supported in this browser. Use text input below.',
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    if (!isListening) {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCommandText(transcript);
        setIsListening(false);
        handleSendCommand(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Mic className="w-6 h-6 text-purple-400" /> Voice Assistant Studio
        </h1>
        <p className="text-xs text-slate-400">Hands-free voice control for motor disabilities & classroom environment automation</p>
      </div>

      {/* Voice Assistant Interaction Box */}
      <div className="card text-center p-8 space-y-6 border-purple-500/30 bg-purple-950/20">
        <div className="relative w-24 h-24 mx-auto">
          <button
            onClick={toggleSpeechRecognition}
            className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-white transition-all shadow-2xl ${
              isListening
                ? 'bg-rose-600 border-rose-400 animate-pulse'
                : 'bg-purple-600 hover:bg-purple-500 border-purple-400 shadow-purple-500/30'
            }`}
          >
            {isListening ? <MicOff className="w-10 h-10 animate-bounce" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        <div>
          <h3 className="font-bold text-slate-100 text-lg">
            {isListening ? 'Listening for your voice command...' : 'Tap Microphone to Speak Command'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Try saying: <code className="text-sky-300 font-mono font-bold">"Turn on lights"</code>, <code className="text-sky-300 font-mono font-bold">"Raise desk"</code>, or <code className="text-sky-300 font-mono font-bold">"Call teacher"</code>
          </p>
        </div>

        {/* Text Input Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand(commandText);
          }}
          className="flex gap-2 max-w-md mx-auto"
        >
          <input
            type="text"
            placeholder="Or type voice command here..."
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            className="input-field text-xs"
          />
          <button type="submit" disabled={isExecuting} className="btn-primary text-xs shrink-0">
            <Send className="w-4 h-4" /> Send Command
          </button>
        </form>
      </div>

      {/* Recommended Voice Commands Grid */}
      <div className="card space-y-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" /> Supported Voice Phrases
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Turn On Lights', phrase: 'lights_on' },
            { label: 'Turn Off Lights', phrase: 'lights_off' },
            { label: 'Start Fan', phrase: 'fan_on' },
            { label: 'Stop Fan', phrase: 'fan_off' },
            { label: 'Raise Wheelchair Desk', phrase: 'desk_up' },
            { label: 'Lower Wheelchair Desk', phrase: 'desk_down' },
            { label: 'Next Slide', phrase: 'next_slide' },
            { label: 'Previous Slide', phrase: 'previous_slide' },
            { label: 'Call Teacher Assistance', phrase: 'call_teacher' },
          ].map((cmd) => (
            <button
              key={cmd.phrase}
              onClick={() => handleSendCommand(cmd.label)}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-left font-semibold text-slate-300 hover:border-sky-500 hover:text-sky-300 transition-all"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command History Trail */}
      <div className="card space-y-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Recent Voice Command History
        </h3>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {voiceHistory.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-100 font-sans font-bold">"{log.raw_text}"</span>
                <span className="ml-2 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  Intent: {log.intent}
                </span>
              </div>
              <span className={`text-[10px] font-bold font-sans ${log.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {log.success ? 'MATCHED' : 'UNMATCHED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
