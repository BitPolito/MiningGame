import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';

const STORAGE_KEY = 'bp-shake-to-mine';

export default function ShakeToMineControl({ disabled, onShake }) {
  const { tr } = useLocale();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const onShakeRef = useRef(onShake);
  const disabledRef = useRef(disabled);
  const motionRef = useRef(null);
  const lastShakeRef = useRef(0);

  useEffect(() => { onShakeRef.current = onShake; }, [onShake]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  useEffect(() => {
    const available = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    setSupported(available);
    setEnabled(available && sessionStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  useEffect(() => {
    if (!supported || !enabled) return undefined;
    const onMotion = (event) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;
      const current = { x: acceleration.x ?? 0, y: acceleration.y ?? 0, z: acceleration.z ?? 0 };
      const previous = motionRef.current;
      motionRef.current = current;
      if (!previous || disabledRef.current) return;
      const delta = Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y) + Math.abs(current.z - previous.z);
      const now = Date.now();
      if (delta > 24 && now - lastShakeRef.current > 900) {
        lastShakeRef.current = now;
        onShakeRef.current?.();
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [enabled, supported]);

  if (!supported) return null;

  const toggle = async () => {
    if (enabled) {
      sessionStorage.removeItem(STORAGE_KEY);
      setEnabled(false);
      return;
    }
    const MotionEvent = window.DeviceMotionEvent;
    if (typeof MotionEvent?.requestPermission === 'function') {
      try {
        const permission = await MotionEvent.requestPermission();
        if (permission !== 'granted') return;
      } catch {
        return;
      }
    }
    sessionStorage.setItem(STORAGE_KEY, '1');
    setEnabled(true);
  };

  return (
    <button
      type="button"
      className={`bp-shake-toggle${enabled ? ' bp-shake-toggle--active' : ''}`}
      aria-pressed={enabled}
      onClick={toggle}
    >
      {tr(enabled ? 'shakeMiningOn' : 'shakeMiningOff')}
    </button>
  );
}
