'use client';

import * as React from 'react';
import { RefreshCw, Video, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Html5Qrcode } from 'html5-qrcode';

export interface QRScannerProps {
  onScan: (payload: string, isFake?: boolean) => void;
  isProcessing?: boolean;
  isLocked?: boolean;
}

export function QRScanner({ onScan, isProcessing = false, isLocked = false }: QRScannerProps) {
  const [cameras, setCameras] = React.useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = React.useState<string>('');
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const [scannerInitialized, setScannerInitialized] = React.useState(false);
  const [isInternalCooldown, setIsInternalCooldown] = React.useState(false);
  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  
  const lastScannedText = React.useRef<string>('');
  const lastScannedTime = React.useRef<number>(0);

  const activeCameraIdRef = React.useRef(activeCameraId);
  React.useEffect(() => {
    activeCameraIdRef.current = activeCameraId;
  }, [activeCameraId]);

  // Initialize and start scanner on mount
  React.useEffect(() => {
    let isMounted = true;
    const scannerId = 'qr-reader-element';

    // Verify the target container exists in the DOM
    const el = document.getElementById(scannerId);
    if (!el) {
      console.warn('QR Scanner mounting container not ready.');
      return;
    }

    const html5Qrcode = new Html5Qrcode(scannerId);
    scannerRef.current = html5Qrcode;
    setScannerInitialized(true);

    // Request camera permissions and list devices
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        setCameras(devices);
        if (devices.length > 0) {
          // Attempt to find rear/environment camera first as default
          const rearCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
          );
          const defaultCameraId = rearCamera ? rearCamera.id : devices[0].id;
          setActiveCameraId(defaultCameraId);
          startScanning(html5Qrcode, defaultCameraId);
        } else {
          setPermissionError('No camera input devices detected.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Camera access error:', err);
        setPermissionError('Camera permissions denied. Please enable camera access in your browser settings.');
      });

    // Auto resume camera scanning when switching back to tab
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        scannerRef.current &&
        !scannerRef.current.isScanning &&
        activeCameraIdRef.current
      ) {
        startScanning(scannerRef.current, activeCameraIdRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup scanner on unmount
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((e) => console.error('Error stopping scanner during cleanup:', e));
      }
    };
  }, []);

  const isProcessingRef = React.useRef(isProcessing);
  const isLockedRef = React.useRef(isLocked);
  const isInternalCooldownRef = React.useRef(isInternalCooldown);

  React.useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  React.useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  React.useEffect(() => {
    isInternalCooldownRef.current = isInternalCooldown;
  }, [isInternalCooldown]);

  // Helper to start scanning with a specific camera ID
  const startScanning = (scanner: Html5Qrcode, cameraId: string) => {
    const el = document.getElementById('qr-reader-element');
    if (!el) {
      console.warn('QR scanner target container is missing from DOM.');
      return;
    }
    setPermissionError(null);
    scanner
      .start(
        cameraId,
        {
          fps: 25,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          try {
            // Ignore scans when processing, locked, or during internal cooldown
            if (isProcessingRef.current || isLockedRef.current || isInternalCooldownRef.current) return;

            const now = Date.now();
            // Same ticket cooldown (2 seconds)
            if (decodedText === lastScannedText.current && now - lastScannedTime.current < 2000) {
              return;
            }

            // Update last scan metadata
            lastScannedText.current = decodedText;
            lastScannedTime.current = now;

            // Activate 1.5s visual & functional cooldown between any scans
            setIsInternalCooldown(true);
            setTimeout(() => {
              setIsInternalCooldown(false);
            }, 1500);

            onScan(decodedText);
          } catch (e) {
            console.error('Error in QR scan success handler:', e);
          }
        },
        () => {
          // Silent verbose scanner errors (scanning frames)
        }
      )
      .catch((err) => {
        console.error('Error starting scanner:', err);
        setPermissionError('Could not access camera stream. It may be locked by another tab/app.');
      });
  };

  // Switch active camera
  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cameraId = e.target.value;
    setActiveCameraId(cameraId);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        startScanning(scannerRef.current, cameraId);
      } catch (err) {
        console.error('Failed to switch camera:', err);
        setPermissionError('Failed to switch camera feed.');
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden bg-gray-900 border border-gray-800 shadow-lg rounded-xl">
      <CardContent className="p-6 space-y-6">
        
        {/* Cam Selection Bar (visible when multiple cameras are found) */}
        {cameras.length > 1 && !permissionError && (
          <div className="flex items-center gap-2 bg-gray-850 p-2 rounded-lg border border-gray-800/80">
            <Video size={16} className="text-accent-400 shrink-0" />
            <select
              value={activeCameraId}
              onChange={handleCameraChange}
              className="bg-transparent text-xs text-gray-200 font-semibold w-full focus:outline-none cursor-pointer"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id} className="bg-gray-900 text-gray-200">
                  {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewfinder Video Element Container */}
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black border border-gray-850 flex items-center justify-center">
          {/* html5-qrcode targets this element to mount video element */}
          <div id="qr-reader-element" className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Overlay laser scanner animation */}
          {!permissionError && !isProcessing && !isLocked && !isInternalCooldown && (
            <div className="absolute inset-x-0 h-0.5 bg-accent-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-laser w-full z-10 pointer-events-none" />
          )}

          {/* Cooldown or Locked state visual feedback overlay */}
          {(isLocked || isInternalCooldown) && !permissionError && !isProcessing && (
            <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center space-y-2 z-15 select-none pointer-events-none">
              <div className="px-3 py-1.5 rounded bg-warning/20 border border-warning/30 text-[10px] font-bold text-warning-400 uppercase tracking-widest animate-pulse">
                Scanner Paused
              </div>
              <span className="text-[11px] font-semibold text-gray-400">Readying reader...</span>
            </div>
          )}

          {/* Viewfinder brackets */}
          {!permissionError && (
            <>
              <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-accent-400 rounded-tl pointer-events-none z-10" />
              <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-accent-400 rounded-tr pointer-events-none z-10" />
              <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-accent-400 rounded-bl pointer-events-none z-10" />
              <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-accent-400 rounded-br pointer-events-none z-10" />
            </>
          )}

          {/* Error Message state overlay */}
          {permissionError && (
            <div className="absolute inset-0 bg-gray-950 p-6 flex flex-col items-center justify-center text-center space-y-3 z-15">
              <ShieldAlert size={40} className="text-error animate-pulse" />
              <span className="text-xs font-semibold text-gray-300 px-4">
                {permissionError}
              </span>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={24} className="animate-spin text-accent-400" />
                <span className="text-xs font-semibold text-gray-250 uppercase tracking-widest">Verifying Pass...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
