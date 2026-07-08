import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TreeData } from '../types';
import { Ruler, Check, RotateCcw, AlertTriangle, Camera, ArrowDown, ArrowUp, X } from 'lucide-react';

interface ClinometerToolProps {
  treeData: TreeData;
  readOnly?: boolean;
  onUpdate: (treeData: TreeData) => void;
}

/**
 * Live-camera clinometer (two-angle method).
 *
 *   height = distance x ( tan(angleToTop) - tan(angleToBase) )
 *
 * The phone is held upright in portrait. The camera's line of sight runs
 * straight through the centre cross-hair. When the phone is vertical the
 * cross-hair points at the horizon (0 degrees). Tilting the top of the phone
 * back to look up increases DeviceOrientationEvent.beta beyond 90, so the
 * elevation angle we care about is (beta - 90).
 *
 * The two-angle method needs no eye-height and works on sloping ground: aim at
 * the base of the trunk and capture, then aim at the very top and capture.
 */

type Step = 'setup' | 'base' | 'top' | 'result';
type DistanceMode = 'known' | 'gps';

interface GeoPoint {
  lat: number;
  lon: number;
  accuracy: number; // metres, as reported by the device
}

// Default starting gap when using the GPS "walk it out" method — the app
// asks the user to stand about this far from the trunk for the base shot.
const GPS_START_DISTANCE = 1;

// Assumed average adult stride length for the background step counter.
// Not user-editable — it's only ever used as a rough cross-check against
// the GPS reading, never as the primary distance source.
const STEP_LENGTH_M = 0.75;

// How much we trust the step-count distance relative to its own value —
// an uncalibrated stride-length guess is typically accurate to somewhere
// around ±25% for a casual walk. This is a rough, standard assumption for
// an unconfigured pedometer, not a measured figure.
const STEP_RELATIVE_UNCERTAINTY = 0.25;

// Straight-line distance between two GPS points, in metres (haversine).
const haversineMeters = (a: GeoPoint, b: GeoPoint): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

// Wraps the browser geolocation API in a promise with sane accuracy settings.
const getPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This device does not support location services.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
};

export const ClinometerTool: React.FC<ClinometerToolProps> = ({ treeData, readOnly = false, onUpdate }) => {
  const [step, setStep] = useState<Step>('setup');
  const [distance, setDistance] = useState<number>(0);
  const [distanceMode, setDistanceMode] = useState<DistanceMode>('known');

  const [cameraOn, setCameraOn] = useState(false);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [baseAngle, setBaseAngle] = useState<number | null>(null);
  const [topAngle, setTopAngle] = useState<number | null>(null);

  const [baseLocation, setBaseLocation] = useState<GeoPoint | null>(null);
  const [topLocation, setTopLocation] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [stepsWalked, setStepsWalked] = useState<number | null>(null);

  const [cameraError, setCameraError] = useState('');
  const [sensorError, setSensorError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveAngleRef = useRef<number | null>(null);

  // Background step counter (see handleMotion below) — only active in gps
  // mode, only while walking from the base shot to the top shot.
  const stepBaselineRef = useRef<number | null>(null);
  const stepPrimedRef = useRef(false);
  const lastStepAtRef = useRef(0);
  const stepCountRef = useRef(0);
  const countingStepsRef = useRef(false);

  // --- Device tilt sensor --------------------------------------------------
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta === null || e.beta === undefined) return;
    const elevation = Math.round((e.beta - 90) * 10) / 10; // 0 = level with horizon
    liveAngleRef.current = elevation;
    setLiveAngle(elevation);
  }, []);

  // --- Background step counter ----------------------------------------------
  // A lightweight pedometer using the accelerometer: each footstep produces
  // a small bump-and-drop in total acceleration, which shows up as a swing
  // above and then below a slow-moving baseline. This is a rough,
  // uncalibrated estimate — not survey-grade — used purely as a secondary
  // signal to help steady the GPS distance reading when GPS accuracy is
  // poor (e.g. under tree canopy). It never overrides a good GPS reading.
  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
    const magnitude = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);

    if (stepBaselineRef.current === null) {
      stepBaselineRef.current = magnitude;
      return;
    }
    // Slow-moving baseline (roughly gravity + steady posture), updated
    // continuously so it drifts with how the phone is being held.
    stepBaselineRef.current = stepBaselineRef.current * 0.9 + magnitude * 0.1;

    if (!countingStepsRef.current) return;

    const highPass = magnitude - stepBaselineRef.current;
    const now = Date.now();
    const THRESHOLD = 1.1; // m/s^2, above ambient hand-jitter, below a full stride bump
    const REFRACTORY_MS = 300; // don't double-count within one stride's time

    if (!stepPrimedRef.current && highPass > THRESHOLD) {
      stepPrimedRef.current = true;
    } else if (stepPrimedRef.current && highPass < -THRESHOLD && now - lastStepAtRef.current > REFRACTORY_MS) {
      stepPrimedRef.current = false;
      lastStepAtRef.current = now;
      stepCountRef.current += 1;
    }
  }, []);

  // --- Start / stop --------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    window.removeEventListener('deviceorientation', handleOrientation, true);
    window.removeEventListener('devicemotion', handleMotion, true);
    countingStepsRef.current = false;
    setCameraOn(false);
  }, [handleOrientation, handleMotion]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const start = async () => {
    setCameraError('');
    setSensorError('');
    setGpsError('');
    setBaseAngle(null);
    setTopAngle(null);
    setBaseLocation(null);
    setTopLocation(null);
    setStepsWalked(null);
    setSaved(false);

    stepBaselineRef.current = null;
    stepPrimedRef.current = false;
    lastStepAtRef.current = 0;
    stepCountRef.current = 0;
    countingStepsRef.current = false;

    // 1) Motion permission (iOS 13+ needs an explicit prompt on a tap)
    try {
      const anyEvent = DeviceOrientationEvent as any;
      if (typeof anyEvent?.requestPermission === 'function') {
        const state = await anyEvent.requestPermission();
        if (state !== 'granted') {
          setSensorError('Motion access was declined, so angles can\'t be read automatically. Use "Enter angle manually" instead.');
        }
      }
      if (typeof DeviceOrientationEvent !== 'undefined') {
        window.addEventListener('deviceorientation', handleOrientation, true);
      } else {
        setSensorError('This device has no tilt sensor. Use "Enter angle manually" instead.');
      }
    } catch {
      setSensorError('Could not start the tilt sensor. Use "Enter angle manually" instead.');
    }

    // 1b) Accelerometer permission — purely a background step-count signal
    // used to help steady GPS distance readings. Entirely optional: if
    // it's denied or unsupported, the tool just falls back to GPS alone,
    // no different from how it already behaves today.
    try {
      const anyMotion = DeviceMotionEvent as any;
      if (typeof anyMotion?.requestPermission === 'function') {
        await anyMotion.requestPermission().catch(() => {});
      }
      if (typeof DeviceMotionEvent !== 'undefined') {
        window.addEventListener('devicemotion', handleMotion, true);
      }
    } catch {
      // Silently unavailable — GPS-only distance is used instead.
    }

    // 2) Camera — request the stream now, but don't try to attach it to the
    // <video> element yet: that element only exists once we're on the
    // base/top step, which hasn't happened yet. Move to that step first,
    // then a dedicated effect (below) attaches the stream once the element
    // is actually mounted.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
    } catch {
      setCameraError('Camera access was blocked. You can still measure using "Enter angle manually", or allow camera access in your browser settings.');
    }

    setStep('base');
  };

  // Attach the camera stream to the <video> element once it exists (i.e.
  // once we're on the base/top step) and play it. cameraOn only flips to
  // true once frames are actually flowing, so we never show a false "camera
  // is on" state with nothing behind it.
  useEffect(() => {
    if (step !== 'base' && step !== 'top') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.play().catch(() => {
      setCameraError('Camera access was blocked. You can still measure using "Enter angle manually", or allow camera access in your browser settings.');
    });
  }, [step]);

  // --- Capture -------------------------------------------------------------
  const captureCurrent = async () => {
    const a = liveAngleRef.current;
    if (a === null) return;

    if (distanceMode === 'gps') {
      setGpsError('');
      setLocating(true);
      try {
        const pos = await getPosition();
        const point: GeoPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (step === 'base') {
          setBaseAngle(a);
          setBaseLocation(point);
          // Start counting steps fresh for the walk from here to the top shot.
          stepCountRef.current = 0;
          stepPrimedRef.current = false;
          countingStepsRef.current = true;
          setStep('top');
        } else if (step === 'top') {
          countingStepsRef.current = false;
          setStepsWalked(stepCountRef.current);
          setTopAngle(a);
          setTopLocation(point);
          setStep('result');
        }
      } catch {
        setGpsError('Could not get your location. Make sure Location access is allowed for this site, then try again.');
      } finally {
        setLocating(false);
      }
      return;
    }

    if (step === 'base') { setBaseAngle(a); setStep('top'); }
    else if (step === 'top') { setTopAngle(a); setStep('result'); }
  };

  const redo = () => {
    setBaseAngle(null);
    setTopAngle(null);
    setBaseLocation(null);
    setTopLocation(null);
    setStepsWalked(null);
    setGpsError('');
    setSaved(false);
    stepCountRef.current = 0;
    stepPrimedRef.current = false;
    countingStepsRef.current = false;
    setStep('base');
  };

  // --- Height calculation --------------------------------------------------
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Only used in gps mode. The base shot is taken from ~1m off the trunk, so
  // that point is essentially standing in for the tree's own location. That
  // means the straight-line GPS distance from the base point to the top
  // point is a good estimate of the true distance to the trunk from wherever
  // the top shot ends up — regardless of the route walked to get there (in
  // a straight line, around a building, whatever). No need to assume a
  // direct walk-back.
  const gpsDistanceToTop = baseLocation && topLocation ? haversineMeters(baseLocation, topLocation) : null;

  // Combined GPS uncertainty — a rough sense of how much the GPS distance
  // could be off by, since each fix has its own accuracy radius.
  const gpsCombinedAccuracy = baseLocation && topLocation
    ? Math.sqrt(baseLocation.accuracy ** 2 + topLocation.accuracy ** 2)
    : null;
  const gpsAccuracyIsPoor = gpsCombinedAccuracy !== null && gpsDistanceToTop !== null
    ? (gpsCombinedAccuracy > 10 || gpsCombinedAccuracy > gpsDistanceToTop * 0.4)
    : false;

  // Background step-count distance, as a cross-check on the GPS reading.
  const stepDistanceEstimate = stepsWalked !== null && stepsWalked > 0 ? stepsWalked * STEP_LENGTH_M : null;

  // Blend GPS and step-count distances by how much each is trusted (simple
  // inverse-variance weighting): GPS's own reported accuracy becomes its
  // uncertainty, and the step estimate is assumed uncertain by a fixed
  // percentage of its own value. When GPS is strong, it dominates the blend
  // almost completely; when GPS is weak, the step count anchors the number
  // and pulls it back toward something steadier — without ever silently
  // overriding a good GPS reading.
  let finalGpsDistance = gpsDistanceToTop;
  let stepsContributed = false;
  if (gpsDistanceToTop !== null && gpsCombinedAccuracy !== null && gpsCombinedAccuracy > 0 && stepDistanceEstimate !== null) {
    const gpsWeight = 1 / (gpsCombinedAccuracy ** 2);
    const stepWeight = 1 / ((stepDistanceEstimate * STEP_RELATIVE_UNCERTAINTY) ** 2);
    finalGpsDistance = (gpsDistanceToTop * gpsWeight + stepDistanceEstimate * stepWeight) / (gpsWeight + stepWeight);
    stepsContributed = Math.abs(finalGpsDistance - gpsDistanceToTop) > 0.3;
  }

  let height: number | null = null;
  if (distanceMode === 'known') {
    if (distance > 0 && topAngle !== null && baseAngle !== null) {
      height = distance * (Math.tan(toRad(topAngle)) - Math.tan(toRad(baseAngle)));
    }
  } else if (distanceMode === 'gps') {
    if (finalGpsDistance !== null && topAngle !== null && baseAngle !== null) {
      // Base shot (taken ~1m from the trunk) establishes eye height; top
      // shot (taken from finalGpsDistance away, wherever that ends up)
      // reaches the treetop. This collapses to the standard two-angle
      // formula when the two shots are taken from the same spot.
      height = finalGpsDistance * Math.tan(toRad(topAngle)) - GPS_START_DISTANCE * Math.tan(toRad(baseAngle));
    }
  }
  const heightRounded = height !== null && isFinite(height) && height > 0 ? Math.round(height * 10) / 10 : null;

  const saveToReport = () => {
    if (readOnly || heightRounded === null) return;
    onUpdate({ ...treeData, height: heightRounded });
    setSaved(true);
  };

  // --- Instruction text per step ------------------------------------------
  const banner = distanceMode === 'gps' ? {
    base: { icon: ArrowDown, title: 'Stand ~1m from the trunk', body: 'Aim the cross-hair at the base of the trunk, hold steady, then tap Capture. Your starting spot gets marked automatically.' },
    top:  { icon: ArrowUp,   title: 'Move back, then aim at the TOP', body: "No need to walk backwards — face where you're going and watch your footing. Once you can see the whole tree, turn and aim the cross-hair at the top, then tap Capture." },
  } as const : {
    base: { icon: ArrowDown, title: 'Aim at the BASE of the trunk', body: 'Line up the cross-hair with the bottom of the tree, hold steady, then tap Capture.' },
    top:  { icon: ArrowUp,   title: 'Aim at the TOP of the tree',   body: 'Line up the cross-hair with the very highest point, hold steady, then tap Capture.' },
  } as const;

  // ========================================================================
  //  SETUP STEP
  // ========================================================================
  if (step === 'setup') {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Ruler className="text-[var(--leaf)]" size={22} />
          <h2 className="text-xl font-semibold">Measure Tree Height</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Uses your phone camera and tilt sensor. Stand back far enough to see the whole tree, then aim at its base and its top.
        </p>

        {/* Distance-mode selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setDistanceMode('known')}
            disabled={readOnly}
            className={`text-left rounded-xl border p-4 transition-colors ${
              distanceMode === 'known'
                ? 'border-[var(--border-bright)] bg-[rgba(90,143,90,0.12)]'
                : 'border-[var(--border)] hover:border-[var(--border-bright)]'
            }`}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">I know my distance to the trunk</p>
            <p className="text-xs text-[var(--text-muted)]">Measured how far you're standing from the trunk with a tape, or by pacing it out.</p>
          </button>
          <button
            onClick={() => setDistanceMode('gps')}
            disabled={readOnly}
            className={`text-left rounded-xl border p-4 transition-colors ${
              distanceMode === 'gps'
                ? 'border-[var(--border-bright)] bg-[rgba(90,143,90,0.12)]'
                : 'border-[var(--border)] hover:border-[var(--border-bright)]'
            }`}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Walk it out with GPS</p>
            <p className="text-xs text-[var(--text-muted)]">No measuring needed — your phone works out the distance from GPS, wherever you end up.</p>
          </button>
        </div>

        {distanceMode === 'known' ? (
          <>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 mb-5">
              <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">1</span> Measure your distance from the trunk (e.g. with a tape or by pacing) and type it in below.</li>
                <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">2</span> Hold the phone upright. Aim the cross-hair at the base of the trunk and capture.</li>
                <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">3</span> Tilt up, aim the cross-hair at the treetop and capture. The height appears automatically.</li>
              </ol>
            </div>

            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Horizontal distance to the trunk (metres)
            </label>
            <input
              type="number" min="0" step="0.1" inputMode="decimal"
              value={distance || ''}
              disabled={readOnly}
              onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-3 text-lg border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent mb-5"
              placeholder="e.g. 10"
            />

            <button
              onClick={start}
              disabled={readOnly || distance <= 0}
              className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-4 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base font-medium"
            >
              <Camera size={20} />
              {distance > 0 ? 'Start camera' : 'Enter a distance first'}
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 mb-5">
              <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">1</span> Stand about 1m from the trunk. Aim the cross-hair at the base and capture — this marks your spot.</li>
                <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">2</span> Walk normally to wherever you can see the whole tree — face where you're going, not the tree. Any route is fine, even around a building.</li>
                <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">3</span> Aim the cross-hair at the treetop and capture. Your phone measures the distance from GPS, and the height appears automatically.</li>
              </ol>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-[rgba(212,160,23,0.3)] bg-[rgba(212,160,23,0.12)] p-3 mb-3">
              <AlertTriangle size={16} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                <strong>You do not need to walk backwards or keep the tree in frame while moving.</strong>
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-[rgba(212,160,23,0.3)] bg-[rgba(212,160,23,0.12)] p-3 mb-5">
              <AlertTriangle size={16} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                This uses your phone's location (plus your step count in the background, as a cross-check) to measure the distance, which is a rough estimate — usually accurate to a few metres. Good for spots you can't measure directly; for the most accurate result, use "I know my distance to the trunk" with a tape or paced-out measurement instead. You'll be asked to allow Location access, and Motion access if your device supports it.
              </p>
            </div>

            <button
              onClick={start}
              disabled={readOnly}
              className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-4 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base font-medium"
            >
              <Camera size={20} />
              Start camera
            </button>
          </>
        )}

        {treeData.height ? (
          <p className="text-xs text-[var(--text-muted)] mt-4 text-center">Current saved height: <strong className="text-[var(--leaf)]">{treeData.height} m</strong></p>
        ) : null}
      </div>
    );
  }

  // ========================================================================
  //  RESULT STEP
  // ========================================================================
  if (step === 'result') {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Ruler className="text-[var(--leaf)]" size={22} />
          <h2 className="text-xl font-semibold">Measurement complete</h2>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-center mb-5">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-1">Estimated height</p>
          <p className="text-5xl font-semibold text-[var(--leaf)]">
            {heightRounded !== null ? `${heightRounded.toFixed(1)} m` : '—'}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-4 text-sm text-[var(--text-muted)]">
            {distanceMode === 'known' ? (
              <span>Distance: <strong className="text-[var(--text-secondary)]">{distance} m</strong></span>
            ) : (
              <span>Distance: <strong className="text-[var(--text-secondary)]">{finalGpsDistance !== null ? `~${finalGpsDistance.toFixed(1)} m` : '—'}</strong></span>
            )}
            <span>Base: <strong className="text-[var(--text-secondary)]">{baseAngle?.toFixed(1)}°</strong></span>
            <span>Top: <strong className="text-[var(--text-secondary)]">{topAngle?.toFixed(1)}°</strong></span>
          </div>
          {distanceMode === 'gps' && stepsWalked !== null && stepsWalked > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Background step count: ~{stepsWalked} steps (~{stepDistanceEstimate?.toFixed(1)} m){stepsContributed ? ' — used to help steady the GPS reading.' : ', roughly matching the GPS reading.'}
            </p>
          )}
          {heightRounded === null && (
            <p className="text-xs text-[var(--amber-light)] mt-3">
              That didn't produce a valid height. Make sure the top angle is higher than the base angle, then try again.
            </p>
          )}
          {distanceMode === 'gps' && gpsAccuracyIsPoor && heightRounded !== null && (
            <p className="text-xs text-[var(--amber-light)] mt-3">
              Your phone's location accuracy was low for this measurement (roughly ±{gpsCombinedAccuracy?.toFixed(0)}m){stepsContributed ? ', though the background step count helped steady the estimate' : ''}. Treat this height as a rough estimate{stepsContributed ? '' : ' — try again in a more open area, or use "I know my distance to the trunk" for a more precise result'}.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveToReport}
            disabled={readOnly || heightRounded === null}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-4 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            <Check size={18} />
            {saved ? 'Saved to Tree Data' : 'Save height to Tree Data'}
          </button>
          <button
            onClick={redo}
            disabled={readOnly}
            className="flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-4 rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] transition-colors"
          >
            <RotateCcw size={16} /> Redo
          </button>
        </div>

        {saved && (
          <p className="text-xs text-[var(--leaf)] mt-4 text-center">
            Height added to Tree Data. Press <strong>Save</strong> on the report to store it permanently.
          </p>
        )}

        <button onClick={() => { stopCamera(); setStep('setup'); }} className="w-full mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          Start a new measurement
        </button>
      </div>
    );
  }

  // ========================================================================
  //  CAMERA STEPS (base / top)
  // ========================================================================
  const b = banner[step as 'base' | 'top'];
  const BannerIcon = b.icon;

  return (
    <div className="relative w-full" style={{ height: 'min(78vh, 720px)', background: '#000' }}>
      {/* Live camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onPlaying={() => setCameraOn(true)}
        onLoadedMetadata={() => setCameraOn(true)}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover' }}
      />
      {!cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--forest)]">
          <div className="text-center text-[var(--text-muted)] px-6">
            <Camera size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{cameraError || 'Starting camera…'}</p>
          </div>
        </div>
      )}

      {/* Cross-hair overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* horizontal reference line */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.5)' }} />
        {/* vertical reference line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.5)' }} />
        {/* centre reticle */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 54, height: 54, borderRadius: '50%',
          border: '2px solid var(--leaf)', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 6, height: 6, borderRadius: '50%', background: 'var(--leaf)',
        }} />
      </div>

      {/* Top instruction banner */}
      <div className="absolute top-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0))' }}>
        <div className="flex items-start gap-2 text-white max-w-2xl mx-auto">
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[rgba(90,143,90,0.35)] border border-[var(--leaf)] flex items-center justify-center">
            <BannerIcon size={18} className="text-[var(--leaf)]" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{b.title}</p>
            <p className="text-xs text-white/80 leading-snug">{b.body}</p>
          </div>
          <button onClick={() => { stopCamera(); setStep('setup'); }} className="ml-auto shrink-0 pointer-events-auto p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white" title="Close camera">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Live angle read-out near the reticle */}
      <div style={{ position: 'absolute', top: 'calc(50% + 42px)', left: '50%', transform: 'translateX(-50%)' }} className="pointer-events-none">
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--leaf)' }}>
          {liveAngle !== null ? `${liveAngle.toFixed(1)}°` : (manualMode ? 'manual' : 'move phone…')}
        </span>
      </div>

      {/* Progress chips */}
      <div className="absolute left-0 right-0 flex justify-center gap-2" style={{ bottom: 108 }}>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: baseAngle !== null ? 'rgba(90,143,90,0.85)' : 'rgba(0,0,0,0.5)', color: '#fff' }}>
          Base {baseAngle !== null ? `✓ ${baseAngle.toFixed(1)}°` : ''}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: topAngle !== null ? 'rgba(90,143,90,0.85)' : 'rgba(0,0,0,0.5)', color: '#fff' }}>
          Top {topAngle !== null ? `✓ ${topAngle.toFixed(1)}°` : ''}
        </span>
      </div>

      {/* Capture control */}
      <div className="absolute left-0 right-0 bottom-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))' }}>
        <div className="max-w-2xl mx-auto">
          {sensorError && (
            <div className="flex items-start gap-2 rounded-lg bg-black/50 p-2 mb-3">
              <AlertTriangle size={14} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
              <p className="text-xs text-white/85">{sensorError}</p>
            </div>
          )}

          {gpsError && (
            <div className="flex items-start gap-2 rounded-lg bg-black/50 p-2 mb-3">
              <AlertTriangle size={14} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
              <p className="text-xs text-white/85">{gpsError}</p>
            </div>
          )}

          {manualMode ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number" step="0.1" inputMode="decimal" autoFocus
                placeholder={`${step === 'base' ? 'Base' : 'Top'} angle (°)`}
                onChange={(e) => { const v = parseFloat(e.target.value); liveAngleRef.current = isFinite(v) ? v : null; setLiveAngle(isFinite(v) ? v : null); }}
                className="flex-1 px-3 py-3 rounded-lg bg-white/95 text-gray-900 text-lg"
              />
            </div>
          ) : null}

          <button
            onClick={captureCurrent}
            disabled={liveAngle === null || locating}
            className="w-full flex items-center justify-center gap-2 bg-[var(--leaf)] text-[var(--forest)] px-4 py-4 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera size={20} />
            {locating ? 'Getting your location…' : `Capture ${step === 'base' ? 'base' : 'top'} angle`}
          </button>

          {!manualMode && (
            <button onClick={() => setManualMode(true)} className="w-full mt-2 text-xs text-white/70 hover:text-white pointer-events-auto">
              No sensor reading? Enter angle manually
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
