"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppHeader } from "../components/AppHeader";

type SensorStatus = "idle" | "requesting" | "active" | "denied" | "unsupported";
type CalibrationData = {
  ratedRPM: number;
  ratedFlow: number;
  cyclesPerRevolution: number;
};

const DEFAULT_CALIBRATION: CalibrationData = {
  ratedRPM: 3450,
  ratedFlow: 20,
  cyclesPerRevolution: 2,
};

export default function PumpMonitorPage() {
  const [magnetometerStatus, setMagnetometerStatus] = useState<SensorStatus>("idle");
  const [accelerometerStatus, setAccelerometerStatus] = useState<SensorStatus>("idle");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentRPM, setCurrentRPM] = useState(0);
  const [estimatedFlow, setEstimatedFlow] = useState(0);
  const [signalStrength, setSignalStrength] = useState(0);
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData>(DEFAULT_CALIBRATION);
  
  const magnetometerRef = useRef<any>(null);
  const accelerometerRef = useRef<any>(null);
  const magneticDataRef = useRef<number[]>([]);
  const vibrationDataRef = useRef<number[]>([]);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load calibration from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pumpMonitorCalibration");
      if (stored) {
        setCalibration(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to load calibration:", error);
    }
  }, []);

  // Save calibration to localStorage
  const saveCalibration = useCallback((data: CalibrationData) => {
    try {
      localStorage.setItem("pumpMonitorCalibration", JSON.stringify(data));
      setCalibration(data);
    } catch (error) {
      console.warn("Failed to save calibration:", error);
    }
  }, []);

  // FFT-like frequency detection using autocorrelation
  const detectDominantFrequency = useCallback((data: number[], sampleRate: number): number => {
    if (data.length < 20) return 0;

    // Simple peak detection in time domain
    let maxMagnitude = 0;
    let peakCount = 0;
    let lastPeakIndex = -10;
    const threshold = Math.max(...data.map(Math.abs)) * 0.3;

    for (let i = 1; i < data.length - 1; i++) {
      if (Math.abs(data[i]) > threshold && 
          Math.abs(data[i]) > Math.abs(data[i - 1]) && 
          Math.abs(data[i]) > Math.abs(data[i + 1])) {
        if (i - lastPeakIndex > 5) {
          peakCount++;
          maxMagnitude = Math.max(maxMagnitude, Math.abs(data[i]));
          lastPeakIndex = i;
        }
      }
    }

    if (peakCount < 2) return 0;

    // Estimate frequency from average peak spacing
    const avgPeakSpacing = data.length / peakCount;
    const frequency = sampleRate / avgPeakSpacing;

    return frequency;
  }, []);

  // Analyze sensor data and update RPM
  const analyzeData = useCallback(() => {
    if (magneticDataRef.current.length < 20) return;

    const sampleRate = 60; // Hz (typical sensor rate)
    const magneticFreq = detectDominantFrequency(magneticDataRef.current, sampleRate);
    
    if (magneticFreq > 0) {
      // Convert magnetic frequency to RPM
      const rpm = (magneticFreq * 60) / calibration.cyclesPerRevolution;
      setCurrentRPM(Math.round(rpm));

      // Calculate estimated flow based on calibration
      const flowRatio = rpm / calibration.ratedRPM;
      const flow = calibration.ratedFlow * flowRatio;
      setEstimatedFlow(flow);

      // Calculate signal strength (0-100%)
      const maxMagnitude = Math.max(...magneticDataRef.current.map(Math.abs));
      const strength = Math.min(100, Math.max(0, maxMagnitude * 200));
      setSignalStrength(Math.round(strength));
    }
  }, [calibration, detectDominantFrequency]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    try {
      // Check if Generic Sensor API is available
      if (typeof window === "undefined" || !("Magnetometer" in window)) {
        setMagnetometerStatus("unsupported");
        setAccelerometerStatus("unsupported");
        return;
      }

      setMagnetometerStatus("requesting");
      setAccelerometerStatus("requesting");

      // Request magnetometer
      try {
        const Magnetometer = (window as any).Magnetometer;
        magnetometerRef.current = new Magnetometer({ frequency: 60 });
        
        magnetometerRef.current.addEventListener("reading", () => {
          const { x, y, z } = magnetometerRef.current;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          magneticDataRef.current.push(magnitude);
          if (magneticDataRef.current.length > 120) {
            magneticDataRef.current.shift();
          }
        });

        magnetometerRef.current.addEventListener("error", (event: any) => {
          if (event.error.name === "NotAllowedError") {
            setMagnetometerStatus("denied");
          } else {
            setMagnetometerStatus("unsupported");
          }
        });

        magnetometerRef.current.start();
        setMagnetometerStatus("active");
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          setMagnetometerStatus("denied");
        } else {
          setMagnetometerStatus("unsupported");
        }
      }

      // Request accelerometer
      try {
        const Accelerometer = (window as any).Accelerometer;
        accelerometerRef.current = new Accelerometer({ frequency: 60 });
        
        accelerometerRef.current.addEventListener("reading", () => {
          const { x, y, z } = accelerometerRef.current;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          vibrationDataRef.current.push(magnitude);
          if (vibrationDataRef.current.length > 120) {
            vibrationDataRef.current.shift();
          }
        });

        accelerometerRef.current.addEventListener("error", (event: any) => {
          if (event.error.name === "NotAllowedError") {
            setAccelerometerStatus("denied");
          } else {
            setAccelerometerStatus("unsupported");
          }
        });

        accelerometerRef.current.start();
        setAccelerometerStatus("active");
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          setAccelerometerStatus("denied");
        } else {
          setAccelerometerStatus("unsupported");
        }
      }

      // Start analysis interval
      analysisIntervalRef.current = setInterval(analyzeData, 1000);
      setIsMonitoring(true);
    } catch (error) {
      console.error("Error starting sensors:", error);
    }
  }, [analyzeData]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (magnetometerRef.current) {
      magnetometerRef.current.stop();
      magnetometerRef.current = null;
    }
    if (accelerometerRef.current) {
      accelerometerRef.current.stop();
      accelerometerRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    magneticDataRef.current = [];
    vibrationDataRef.current = [];
    setIsMonitoring(false);
    setMagnetometerStatus("idle");
    setAccelerometerStatus("idle");
    setCurrentRPM(0);
    setEstimatedFlow(0);
    setSignalStrength(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  const getSensorStatusColor = (status: SensorStatus) => {
    switch (status) {
      case "active": return "text-green-600 dark:text-green-400";
      case "denied": return "text-red-600 dark:text-red-400";
      case "unsupported": return "text-orange-600 dark:text-orange-400";
      case "requesting": return "text-blue-600 dark:text-blue-400";
      default: return "text-slate-600 dark:text-slate-400";
    }
  };

  const getSensorStatusText = (status: SensorStatus) => {
    switch (status) {
      case "active": return "Active";
      case "denied": return "Permission Denied";
      case "unsupported": return "Not Supported";
      case "requesting": return "Requesting...";
      default: return "Idle";
    }
  };

  const getSignalQuality = () => {
    if (signalStrength > 70) return { text: "Excellent", color: "text-green-600 dark:text-green-400" };
    if (signalStrength > 40) return { text: "Good", color: "text-blue-600 dark:text-blue-400" };
    if (signalStrength > 20) return { text: "Fair", color: "text-orange-600 dark:text-orange-400" };
    return { text: "Poor", color: "text-red-600 dark:text-red-400" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <AppHeader 
          title="Pump Flow Monitor" 
          subtitle="Experimental acoustic/magnetic diagnostics tool"
        />

        {/* Disclaimer */}
        <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 ring-1 ring-orange-200 dark:ring-orange-800 p-4 sm:p-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-1">Experimental Educational Tool</h3>
              <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
                This tool is designed for education, diagnostics, and accessibility—not for certified measurements. 
                Accuracy varies by device and environment. Use for trend analysis and learning purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Main Control Panel */}
        <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Monitor Controls</h2>
            <button
              onClick={() => setShowCalibration(!showCalibration)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              {showCalibration ? "Hide" : "Show"} Calibration
            </button>
          </div>

          {/* Calibration Panel */}
          {showCalibration && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Calibration (Device + Pump Specific)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rated RPM
                  </label>
                  <input
                    type="number"
                    value={calibration.ratedRPM}
                    onChange={(e) => saveCalibration({ ...calibration, ratedRPM: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rated Flow (GPM)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={calibration.ratedFlow}
                    onChange={(e) => saveCalibration({ ...calibration, ratedFlow: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cycles/Revolution
                  </label>
                  <input
                    type="number"
                    value={calibration.cyclesPerRevolution}
                    onChange={(e) => saveCalibration({ ...calibration, cyclesPerRevolution: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Calibration is saved locally to your device. Adjust based on your specific pump model.
              </p>
            </div>
          )}

          {/* Sensor Status */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Magnetometer</div>
              <div className={`text-sm font-bold ${getSensorStatusColor(magnetometerStatus)}`}>
                {getSensorStatusText(magnetometerStatus)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Accelerometer</div>
              <div className={`text-sm font-bold ${getSensorStatusColor(accelerometerStatus)}`}>
                {getSensorStatusText(accelerometerStatus)}
              </div>
            </div>
          </div>

          {/* Start/Stop Button */}
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            disabled={magnetometerStatus === "denied" || magnetometerStatus === "unsupported"}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              isMonitoring
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed"
            }`}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </button>

          {/* Help Text */}
          {!isMonitoring && magnetometerStatus === "idle" && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 text-center">
              Position your device near the pump motor end-bell or fan housing, then start monitoring.
            </p>
          )}

          {magnetometerStatus === "denied" && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3 text-center">
              Sensor permission denied. Please enable sensor access in your browser settings.
            </p>
          )}

          {magnetometerStatus === "unsupported" && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-3 text-center">
              Sensors not supported. Try using Chrome or Edge on Android, or Safari on iOS 14+.
            </p>
          )}
        </div>

        {/* Readings Display */}
        {isMonitoring && (
          <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Live Readings</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* RPM */}
              <div className="text-center">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">RPM</div>
                <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-1">
                  {currentRPM}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">revolutions/minute</div>
              </div>

              {/* Flow */}
              <div className="text-center">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Estimated Flow</div>
                <div className="text-4xl font-black text-green-600 dark:text-green-400 mb-1">
                  {estimatedFlow.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">gallons/minute</div>
              </div>

              {/* Signal Quality */}
              <div className="text-center">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Signal Quality</div>
                <div className={`text-2xl font-black ${getSignalQuality().color} mb-1`}>
                  {getSignalQuality().text}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">{signalStrength}% strength</div>
              </div>
            </div>

            {/* Signal Strength Bar */}
            <div className="mt-6">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${signalStrength}%` }}
                />
              </div>
            </div>

            {/* Tips */}
            {signalStrength < 30 && (
              <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-sm text-blue-800 dark:text-blue-300">
                <strong>Tip:</strong> Try repositioning your device closer to the motor housing or rotating it to find the optimal orientation.
              </div>
            )}
          </div>
        )}

        {/* Information Panel */}
        <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              This tool uses your device&apos;s <strong>magnetometer</strong> to detect magnetic field oscillations 
              from the pump motor, and the <strong>accelerometer</strong> to monitor mechanical vibrations.
            </p>
            <p>
              <strong>RPM Detection:</strong> Magnetic cycles from motor rotation are analyzed to estimate speed.
            </p>
            <p>
              <strong>Flow Estimation:</strong> Based on your calibration, flow is calculated proportionally to RPM.
            </p>
            <p>
              <strong>Best Practices:</strong> Position the device near the motor end-bell, avoid metal shielding, 
              and calibrate with known pump specifications for best results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
