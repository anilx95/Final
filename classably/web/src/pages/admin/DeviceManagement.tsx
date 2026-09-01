import React, { useEffect, useState } from 'react';
import { Cpu, Power, Sliders, Activity, RefreshCw, Lightbulb, Fan, Tv, ShieldAlert } from 'lucide-react';
import { devicesApi } from '../../api/client';
import { SmartDevice, SensorMetric } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

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
      setDevices(Array.isArray(devRes.data) ? devRes.data : []);
      setSensors(Array.isArray(sensRes.data) ? sensRes.data : []);
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
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] flex items-center gap-2.5 tracking-tight">
            <Cpu className="w-5 h-5 text-[#1d43d9]" /> Smart Hardware & Sensors
          </h1>
          <p className="text-xs text-slate-500 mt-1">IoT device controllers and environmental telemetry.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="text-xs text-slate-500 font-semibold">Classroom:</label>
          <select
            value={classroomId}
            onChange={(e) => setClassroomId(Number(e.target.value))}
            className="py-1.5 px-3 text-xs w-auto bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#1d43d9] shadow-2xs"
          >
            <option value={1}>Smart Classroom 101 (Main Block)</option>
            <option value={2}>Accessibility Lab 202</option>
          </select>

          <button
            type="button"
            onClick={fetchDeviceData}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sensor Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {sensors.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">{s.type.replace('_', ' ')}</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {s.value} <span className="text-xs font-semibold text-[#1d43d9]">{s.unit}</span>
              </div>
            </div>
            <Activity className="w-5 h-5 text-[#1d43d9]/40" />
          </div>
        ))}
      </div>

      {/* Devices Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 tracking-tight">
          <Sliders className="w-4 h-4 text-[#1d43d9]" /> Active IoT Hardware Devices
        </h3>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            Connecting to IoT telemetry server...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.device_type);
              const isOn = device.state?.on || device.state?.open || device.state?.locked;
              return (
                <div key={device.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${isOn ? 'bg-blue-50 border-blue-200 text-[#1d43d9]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm tracking-tight">{device.name}</h4>
                        <p className="text-[11px] text-slate-500 capitalize">{device.device_type} Controller</p>
                      </div>
                    </div>

                    <Badge variant={device.status === 'online' ? 'success' : 'danger'} size="sm">
                      {device.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Device Parameters */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs font-mono text-slate-700">
                    <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(device.state, null, 2)}</pre>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCommand(device.id, 'toggle')}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isOn
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : 'bg-[#1d43d9] hover:bg-[#1534b0] text-white shadow-xs'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isOn ? 'Toggle / Off' : 'Turn On'}</span>
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
