import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, CameraOff, Power } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob, dataUrl: string) => void;
  onRetake?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onRetake }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsInitializing(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser or requires HTTPS.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front-facing camera
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (e) {
          // auto-play policy handled
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Unable to access front camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    startCamera();

    // Guaranteed unmount cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          t.stop();
          t.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [startCamera]);

  const takeSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Resizing to max 800px width
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / (video.videoWidth || 640));
    canvas.width = (video.videoWidth || 640) * scale;
    canvas.height = (video.videoHeight || 640) * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image for front camera selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      blob => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setCapturedImage(dataUrl);
          onCapture(blob, dataUrl);
          // Turn off camera hardware immediately after selfie is captured
          stopCamera();
        }
      },
      'image/jpeg',
      0.7
    );
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (onRetake) onRetake();
    startCamera();
  };

  const handleToggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {cameraError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center text-amber-800 w-full mb-3">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-600 mb-2" />
          <p className="font-semibold text-sm">Camera Required</p>
          <p className="text-xs mt-1 text-amber-700">{cameraError}</p>
          <button
            type="button"
            onClick={startCamera}
            className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium transition"
          >
            Retry Camera Access
          </button>
        </div>
      ) : capturedImage ? (
        <div className="w-full flex flex-col items-center">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-brand-500 shadow-lg mb-3">
            <img src={capturedImage} alt="Captured Selfie" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-brand-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-white drop-shadow-md" />
            </div>
          </div>
          <p className="text-xs font-semibold text-emerald-600 mb-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selfie captured & camera turned off
          </p>
          <button
            type="button"
            onClick={handleRetake}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-medium transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" /> Retake Selfie
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-dashed border-brand-500 bg-slate-900 shadow-lg mb-3 flex items-center justify-center">
            {isInitializing ? (
              <div className="text-white text-xs text-center px-4">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                Initializing front camera...
              </div>
            ) : !isCameraActive ? (
              <div className="text-slate-400 text-xs text-center px-4 flex flex-col items-center gap-2">
                <CameraOff className="w-8 h-8 text-slate-500" />
                <span>Camera is currently off</span>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Turn On Camera
                </button>
              </div>
            ) : null}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isInitializing || !isCameraActive ? 'hidden' : 'block'
              }`}
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={takeSelfie}
              disabled={isInitializing || !isCameraActive}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-base font-semibold shadow-md active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" /> Take Selfie
            </button>

            <button
              type="button"
              onClick={handleToggleCamera}
              title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
              className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                isCameraActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isCameraActive ? 'Turn Off' : 'Turn On'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-2">Live camera selfie required (Gallery upload disabled)</p>
        </div>
      )}
    </div>
  );
};

