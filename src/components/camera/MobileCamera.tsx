/**
 * Mobile Camera Component
 * Capture photos, scan QR codes and barcodes on mobile devices
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Camera, QrCode, Barcode, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';

export interface CameraCaptureResult {
  type: 'photo' | 'qr' | 'barcode';
  data: string | Blob;
  timestamp: Date;
}

export interface MobileCameraProps {
  onCapture?: (result: CameraCaptureResult) => void;
  mode?: 'photo' | 'qr' | 'barcode';
  className?: string;
}

export function MobileCamera({ onCapture, mode: initialMode = 'photo', className }: MobileCameraProps) {
  const [mode, setMode] = useState<'photo' | 'qr' | 'barcode'>(initialMode);
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: mode === 'photo' ? 'environment' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setHasPermission(true);
      setIsActive(true);

      // Start scanning if in QR/barcode mode
      if (mode === 'qr' || mode === 'barcode') {
        startScanning();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      setHasPermission(false);
      toast.error('Camera access denied. Please check your permissions.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setIsScanning(false);
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanResult(null);

    scanIntervalRef.current = window.setInterval(() => {
      scanFrame();
    }, 100);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      setScanResult(code.data);
      setIsScanning(false);

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

      onCapture?.({
        type: mode === 'qr' ? 'qr' : 'barcode',
        data: code.data,
        timestamp: new Date(),
      });

      toast.success(`${mode === 'qr' ? 'QR' : 'Barcode'} code detected!`);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);

      onCapture?.({
        type: 'photo',
        data: blob,
        timestamp: new Date(),
      });

      toast.success('Photo captured!');
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const retake = () => {
    setCapturedImage(null);
    setScanResult(null);
    startCamera();
  };

  const handleModeChange = (newMode: 'photo' | 'qr' | 'barcode') => {
    setMode(newMode);
    if (isActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Mobile Camera
        </CardTitle>
        <CardDescription>
          Capture photos, scan QR codes and barcodes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => handleModeChange(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="photo">
              <Camera className="h-4 w-4 mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="barcode">
              <Barcode className="h-4 w-4 mr-2" />
              Barcode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="space-y-4">
            {!isActive && !capturedImage && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Camera className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  Capture photos of tables, documents, or any data you want to digitize
                </p>
                <Button onClick={startCamera} size="lg">
                  <Camera className="mr-2 h-4 w-4" />
                  Open Camera
                </Button>
              </div>
            )}

            {isActive && (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={stopCamera}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="lg"
                    onClick={capturePhoto}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                  </Button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={retake}>
                    Retake
                  </Button>
                  <Button onClick={() => setCapturedImage(null)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Use Photo
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            {!isActive && !scanResult && (
              <div className="flex flex-col items-center gap-4 py-8">
                <QrCode className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  Scan QR codes to quickly import data or link to external resources
                </p>
                <Button onClick={startCamera} size="lg">
                  <QrCode className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              </div>
            )}

            {isActive && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-auto"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-4 border-primary rounded-lg animate-pulse" />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <Button variant="secondary" onClick={stopCamera}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>

                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span>Scanning for QR codes...</span>
                  </div>
                )}
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        QR Code Detected
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 break-all">
                        {scanResult}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={retake}>
                    Scan Another
                  </Button>
                  <Button onClick={() => setScanResult(null)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Use Result
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="barcode" className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Barcode scanning uses the same QR code detector. Most 1D barcodes are also supported.
              </p>
            </div>
            {/* Same content as QR tab */}
            {!isActive && !scanResult && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Barcode className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  Scan barcodes to quickly look up products or add inventory items
                </p>
                <Button onClick={startCamera} size="lg">
                  <Barcode className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              </div>
            )}

            {isActive && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-auto"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-32 border-4 border-primary rounded animate-pulse" />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <Button variant="secondary" onClick={stopCamera}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>

                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span>Scanning for barcodes...</span>
                  </div>
                )}
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Barcode Detected
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 break-all">
                        {scanResult}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={retake}>
                    Scan Another
                  </Button>
                  <Button onClick={() => setScanResult(null)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Use Result
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {hasPermission === false && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Camera Access Denied
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Please allow camera access in your browser settings to use this feature.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
