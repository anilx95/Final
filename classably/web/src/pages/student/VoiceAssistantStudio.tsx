import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Sparkles, Send, Clock } from 'lucide-react';
import { voiceApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

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
      setVoiceHistory(Array.isArray(res.data) ? res.data : []);
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

      const { intent, matched } = res.data;
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
        description: 'Failed to process voice command.',
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
          <Mic className="w-5 h-5 text-indigo-400" /> Voice Assistant Studio
        </h1>
        <p className="text-xs text-slate-400 mt-1">Hands-free voice control for motor disabilities & classroom environment automation</p>
      </div>

      {/* Voice Assistant Interaction Box */}
      <Card variant="ai" className="text-center p-8 space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <button
            onClick={toggleSpeechRecognition}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-white transition-all shadow-xl ${
              isListening
                ? 'bg-rose-600 border-rose-400 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 shadow-indigo-500/30'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8 animate-bounce" /> : <Mic className="w-8 h-8" />}
          </button>
        </div>

        <div>
          <h3 className="font-bold text-slate-100 text-base sm:text-lg tracking-tight">
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
            className="input-field text-xs flex-1"
          />
          <Button
            type="submit"
            disabled={isExecuting}
            isLoading={isExecuting}
            variant="primary"
            size="sm"
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Send
          </Button>
        </form>
      </Card>

      {/* Recommended Voice Commands Grid */}
      <Card variant="default" className="space-y-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
          <Sparkles className="w-4 h-4 text-sky-400" /> Supported Voice Phrases
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
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
              className="p-2.5 rounded-lg bg-[#080c14] border border-[#1b2538] text-left font-semibold text-slate-300 hover:border-sky-500 hover:text-sky-300 transition-all duration-150"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Command History Trail */}
      <Card variant="default" className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
            <Clock className="w-4 h-4 text-slate-400" /> Recent Voice Command History
          </h3>
          <Badge variant="neutral" size="sm">
            {voiceHistory.length} logs
          </Badge>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {voiceHistory.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No voice commands logged yet.</p>
          ) : (
            voiceHistory.map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-[#080c14] border border-[#1b2538] flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-100 font-semibold">"{log.raw_text}"</span>
                  <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                    {log.intent}
                  </span>
                </div>
                <Badge variant={log.success ? 'success' : 'danger'} size="sm">
                  {log.success ? 'MATCHED' : 'UNMATCHED'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
