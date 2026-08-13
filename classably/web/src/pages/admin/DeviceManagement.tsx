import React, { useEffect, useState } from 'react';
import { Cpu, Power, Sliders, Activity, RefreshCw, AlertTriangle, Lightbulb, Fan, Tv, ShieldAlert, Sun } from 'lucide-react';
import { devicesApi } from '../../api/client';
import { SmartDevice, SensorMetric } from '../../types';
import { useToast } from '../../context/ToastContext';

export const DeviceManagement: React.FC = () => {
  const { addToast } = useToast();
  const [classroomId, setClassroomId] = useState(1);
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [sensors, setSensors] = useState<SensorMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeviceData = async () => {
    setLoading(true);
    try {
      const [devRes, sensRes] = await Promise.all([
        devicesApi.getDevices(classroomId),
        devicesApi.getSensors(classroomId),
      ]);
      setDevices(devRes.data);
      setSensors(sensRes.data);
    } catch (err) {
      console.error('Error fetching smart devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceData();
  }, [classroomId]);

  const handleCommand = async (deviceId: number, action: string, value?: any) => {
    try {
      const res = await devicesApi.sendCommand(deviceId, { action, value });
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, state: res.data.new_state } : d))
      );
      addToast({
        type: 'success',
        title: 'Command Dispatched',
        description: 'Device hardware state updated live.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Command Failure',
        description: 'Unable to communicate with smart device controller.',
      });
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light': return Lightbulb;
      case 'fan': return Fan;
      case 'projector': return Tv;
      case 'emergency': return ShieldAlert;
      default: return Cpu;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-sky-400" /> Smart Classroom Hardware & Sensors
          </h1>
          <p className="text-xs text-slate-400">IoT Device controllers, environmental telemetry, and wheelchair desk actuators</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-semibold">Select Classroom:</label>
          <select
            value={classroomId}
            onChange={(e) => setClassroomId(Number(e.target.value))}
            className="input-field py-1.5 px-3 text-xs w-auto"
          >
            <option value={1}>Smart Classroom 101 (Main Block)</option>
            <option value={2}>Accessibility Lab 202</option>
          </select>

          <button onClick={fetchDeviceData} className="btn-secondary text-xs p-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sensor Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {sensors.map((s) => (
          <div key={s.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{s.type.replace('_', ' ')}</div>
              <div className="text-xl font-extrabold text-slate-100 mt-1">
                {s.value} <span className="text-xs font-semibold text-sky-400">{s.unit}</span>
              </div>
            </div>
            <Activity className="w-5 h-5 text-sky-400/60" />
          </div>
        ))}
      </div>

      {/* Devices Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" /> Active IoT Hardware Devices
        </h3>

        {loading ? (
          <div className="card text-center py-12 text-slate-400">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Connecting to IoT telemetry server...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.device_type);
              const isOn = device.state?.on || device.state?.open || device.state?.locked;
              return (
                <div key={device.id} className="card p-5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${isOn ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">{device.name}</h4>
                        <p className="text-[11px] text-slate-400 capitalize">{device.device_type} Controller</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400'}`}>
                      {device.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Device Parameters */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(device.state, null, 2)}</pre>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleCommand(device.id, 'toggle')}
                      className={`btn-primary flex-1 text-xs py-2 ${isOn ? 'bg-amber-600 hover:bg-amber-500' : 'bg-sky-600'}`}
                    >
                      <Power className="w-3.5 h-3.5" /> {isOn ? 'Toggle / Off' : 'Turn On'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
