'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, locationMeta?: { lat: number; lng: number; address: string }) => void;
  title?: string;
  driverName?: string;
  vehicleReg?: string;
  defaultAddress?: string;
}

export const GeotagCameraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCapture,
  title = '📷 Geotagged Odometer Photo Capture',
  driverName = 'Suresh Gowda',
  vehicleReg = 'KA 19 C 4829',
  defaultAddress = 'Mangaluru Central Railway Station, Mangaluru',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [showCameraRequiredPopup, setShowCameraRequiredPopup] = useState<boolean>(false);

  // GPS State
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(true);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>(defaultAddress);
  const [timestampStr, setTimestampStr] = useState<string>('');
  const [showGpsRequiredPopup, setShowGpsRequiredPopup] = useState<boolean>(false);

  const isCameraActive = Boolean(stream && stream.active && isVideoReady && !cameraError);
  const isGpsActive = Boolean(gpsCoords && !isGpsLoading && !gpsErrorMsg);
  const canSnap = isCameraActive && isGpsActive;

  const requestDeviceGpsLocation = () => {
    setIsGpsLoading(true);
    setGpsErrorMsg(null);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy || 3.5;

          setGpsCoords({ lat, lng, accuracy: acc });
          setIsGpsLoading(false);

          // Live Reverse Geocode exact physical address
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { 'User-Agent': 'KandyCabsApp/1.0' } }
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && geoData.display_name) {
                const parts = geoData.display_name.split(', ');
                const cleanAddress = parts.slice(0, 4).join(', ');
                setLocationAddress(cleanAddress);
              }
            }
          } catch {}
        },
        (err) => {
          setIsGpsLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsErrorMsg('Location access denied. Please click "Allow Location" in your browser address bar.');
          } else {
            setGpsErrorMsg('GPS acquiring... Click "Sync Device GPS" button to re-scan exact location.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsGpsLoading(false);
      setGpsErrorMsg('Geolocation API is unsupported in this browser.');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Update live timestamp string
    const updateTime = () => {
      const now = new Date();
      const formatted =
        now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        ', ' +
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      setTimestampStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Request immediate high-accuracy device GPS
    requestDeviceGpsLocation();

    // Watch live high-precision hardware GPS location
    let watchId: number | null = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 3.5,
          });
          setIsGpsLoading(false);
          setGpsErrorMsg(null);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    return () => {
      clearInterval(interval);
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen, defaultAddress]);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    setIsVideoReady(false);
    stopCamera();

    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().then(() => {
            setIsVideoReady(true);
          }).catch(() => {});
        }
      } else {
        setCameraError('Camera access API is not supported in this browser. Please allow camera permissions.');
        setIsVideoReady(false);
      }
    } catch (err: any) {
      console.warn('Camera stream request fallback:', err);
      setCameraError('Live camera feed unavailable or permission required. Turn ON camera or grant camera permission to snap photos.');
      setIsVideoReady(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsVideoReady(false);
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Watermark geotag map location banner onto canvas with Visual Map Graphic
  const drawLocationWatermarkBanner = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const bannerHeight = Math.max(110, Math.round(height * 0.22));
    const bannerY = height - bannerHeight;

    // Dark translucent background with border
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, bannerY, width, bannerHeight);

    // Accent line at top of banner
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, bannerY, width, 4);

    // 1. Draw Visual Mini Map Graphic Box on Bottom-Left
    const mapWidth = Math.max(110, Math.round(width * 0.16));
    const mapHeight = bannerHeight - 20;
    const mapX = 14;
    const mapY = bannerY + 10;

    // Map Container background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(mapX, mapY, mapWidth, mapHeight);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);

    // Map Road Vector Lines
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mapX, mapY + mapHeight * 0.4);
    ctx.lineTo(mapX + mapWidth, mapY + mapHeight * 0.6);
    ctx.stroke();

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mapX + mapWidth * 0.5, mapY);
    ctx.lineTo(mapX + mapWidth * 0.5, mapY + mapHeight);
    ctx.stroke();

    // Map Pin 📍 at Center
    const pinX = mapX + mapWidth / 2;
    const pinY = mapY + mapHeight / 2;

    // Pin pulse ring
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.beginPath();
    ctx.arc(pinX, pinY, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Map Badge Label
    ctx.fillStyle = '#10B981';
    ctx.fillRect(mapX + 4, mapY + 4, 52, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('LIVE MAP', mapX + 8, mapY + 14);

    // 2. Draw Geotag Info Text alongside Mini Map Box
    const textX = mapX + mapWidth + 14;
    let currentY = bannerY + 26;
    const maxTextWidth = width - textX - 16;

    // Line 1: Location Address
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(13, Math.round(width * 0.024))}px sans-serif`;
    ctx.fillText(`📍 Location: ${locationAddress}`, textX, currentY, maxTextWidth);

    currentY += Math.max(22, Math.round(width * 0.034));

    // Line 2: GPS Coordinates & Accuracy
    ctx.fillStyle = '#34D399';
    ctx.font = `bold ${Math.max(11, Math.round(width * 0.02))}px monospace`;
    ctx.fillText(
      gpsCoords
        ? `🌐 GPS: ${gpsCoords.lat.toFixed(5)}° N, ${gpsCoords.lng.toFixed(5)}° E (±${gpsCoords.accuracy.toFixed(1)}m)`
        : `📍 Location: ${locationAddress}`,
      textX,
      currentY,
      maxTextWidth
    );

    currentY += Math.max(20, Math.round(width * 0.03));

    // Line 3: Timestamp & Driver/Vehicle Meta
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${Math.max(10, Math.round(width * 0.018))}px sans-serif`;
    ctx.fillText(
      `📅 ${timestampStr}  •  🚗 ${vehicleReg}  •  👨‍✈️ ${driverName}`,
      textX,
      currentY,
      maxTextWidth
    );
  };

  const handleCapturePhoto = () => {
    if (!isCameraActive) {
      setShowCameraRequiredPopup(true);
      return;
    }

    if (!isGpsActive || !gpsCoords) {
      setShowGpsRequiredPopup(true);
      return;
    }

    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setShowCameraRequiredPopup(true);
      return;
    }

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Draw Map Location Banner Watermark at the bottom
    drawLocationWatermarkBanner(ctx, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCapture(dataUrl, {
      lat: gpsCoords.lat,
      lng: gpsCoords.lng,
      address: locationAddress,
    });
    stopCamera();
    onClose();
  };

  // Fallback file input upload with location watermarking
  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isGpsActive || !gpsCoords) {
      e.target.value = '';
      setShowGpsRequiredPopup(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width || 1280;
        const height = img.height || 720;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          drawLocationWatermarkBanner(ctx, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          onCapture(dataUrl, {
            lat: gpsCoords.lat,
            lng: gpsCoords.lng,
            address: locationAddress,
          });
          stopCamera();
          onClose();
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          background: '#0F172A',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            background: '#1E293B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#F8FAFC', fontWeight: 800 }}>
              {title}
            </h3>
            <div style={{ fontSize: '11.5px', color: canSnap ? '#10B981' : '#F87171', marginTop: '2px', fontWeight: 700 }}>
              {canSnap
                ? '📍 Real-Time Visual Map & Live Camera Stream Active'
                : !isCameraActive && !isGpsActive
                ? '⚠️ Live Camera Stream & GPS Location BOTH Required'
                : !isCameraActive
                ? '📷 Live Camera Stream OFF / Permission Required'
                : '📡 Device GPS Location Turned OFF / Acquiring...'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Viewfinder Container */}
        <div style={{ position: 'relative', width: '100%', height: '480px', background: '#000', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.play().then(() => setIsVideoReady(true)).catch(() => {});
              }
            }}
            onPlaying={() => setIsVideoReady(true)}
            onCanPlay={() => setIsVideoReady(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Camera Feed Offline / Blocked Overlay */}
          {(!isCameraActive || cameraError) && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: '100px',
                background: 'rgba(15, 23, 42, 0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                color: '#F8FAFC',
                zIndex: 4,
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#F87171', marginBottom: '6px' }}>
                {cameraError ? 'Camera Feed OFF / Permission Blocked' : 'Initializing Live Camera Feed...'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#CBD5E1', marginBottom: '16px', maxWidth: '400px', lineHeight: 1.5 }}>
                {cameraError || 'Please wait while camera video stream loads or click button below to turn ON camera.'}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  style={{
                    background: '#EF4444',
                    color: '#fff',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  📷 Turn ON Live Camera Feed
                </button>

                <label
                  style={{
                    background: '#334155',
                    color: '#fff',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📁 Select Photo from Gallery
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadFallback}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Viewfinder Frame Guide */}
          {isCameraActive && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                right: '16px',
                bottom: '120px',
                border: '2px dashed rgba(255, 255, 255, 0.4)',
                borderRadius: '12px',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '10px',
                zIndex: 3,
              }}
            >
              <span
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}
              >
                Align Odometer Display Here
              </span>
            </div>
          )}

          {/* Top Camera Controls */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '8px',
              zIndex: 5,
            }}
          >
            <button
              type="button"
              onClick={requestDeviceGpsLocation}
              style={{
                background: isGpsActive ? '#10B981' : isGpsLoading ? '#3B82F6' : '#EF4444',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isGpsActive ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 2px 8px rgba(239, 68, 68, 0.4)',
              }}
            >
              {isGpsLoading ? '📡 Acquiring GPS...' : isGpsActive ? '📍 Sync / Allow Device GPS' : '📡 Turn ON GPS'}
            </button>

            <button
              type="button"
              onClick={handleToggleCamera}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              🔄 Flip Camera
            </button>
          </div>

          {/* BOTTOM VISUAL MAP LOCATION BANNER OVERLAY */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(15, 23, 42, 0.92)',
              borderTop: `2px solid ${isGpsActive ? '#10B981' : '#EF4444'}`,
              padding: '12px 16px',
              color: '#fff',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              zIndex: 5,
            }}
          >
            {/* Visual Mini Map Graphic Box */}
            <div
              style={{
                width: '100px',
                height: '74px',
                background: '#1E293B',
                borderRadius: '8px',
                border: '1.5px solid #334155',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Exact Map Static Tile */}
              {gpsCoords && (
                <img
                  src={
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                      ? `https://maps.googleapis.com/maps/api/staticmap?center=${gpsCoords.lat},${gpsCoords.lng}&zoom=15&size=200x150&maptype=roadmap&markers=color:red%7C${gpsCoords.lat},${gpsCoords.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                      : `https://staticmap.openstreetmap.de/staticmap.php?center=${gpsCoords.lng},${gpsCoords.lat}&zoom=15&size=200x150&maptype=mapnik&markers=${gpsCoords.lng},${gpsCoords.lat},ol-marker`
                  }
                  alt="Exact Map"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}

              <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
                <defs>
                  <pattern id="map-grid-pattern" width="18" height="18" patternUnits="userSpaceOnUse">
                    <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#334155" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="#0F172A" />
                <rect width="100%" height="100%" fill="url(#map-grid-pattern)" opacity="0.6" />
                <path d="M-10 20 Q 40 10 110 50" fill="none" stroke="#38BDF8" strokeWidth="3" opacity="0.8" />
                <path d="M 50 -10 L 50 80" fill="none" stroke="#64748B" strokeWidth="2.5" opacity="0.7" />
              </svg>

              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: '18px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>📍</span>
                <span
                  style={{
                    width: '8px',
                    height: '4px',
                    background: 'rgba(16, 185, 129, 0.6)',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #10B981',
                  }}
                />
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: isGpsActive ? '#10B981' : '#EF4444',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  letterSpacing: '.05em',
                  zIndex: 2,
                }}
              >
                MAP
              </div>
            </div>

            {/* Geotag Text Meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isGpsActive ? '#10B981' : '#EF4444',
                    boxShadow: isGpsActive ? '0 0 8px #10B981' : '0 0 8px #EF4444',
                  }}
                />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 {locationAddress}
                </div>
              </div>

              <div style={{ fontSize: '11px', color: isGpsActive ? '#34D399' : '#F87171', fontWeight: 700, fontFamily: 'monospace', marginBottom: '3px' }}>
                {isGpsLoading ? (
                  <span style={{ color: '#F59E0B' }}>📡 Acquiring Exact Device GPS Location...</span>
                ) : gpsCoords ? (
                  <span>🌐 GPS: {gpsCoords.lat.toFixed(5)}° N, {gpsCoords.lng.toFixed(5)}° E (±{gpsCoords.accuracy.toFixed(1)}m)</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#F87171' }}>⚠️ {gpsErrorMsg || 'Location access denied / turned off.'}</span>
                    <button
                      type="button"
                      onClick={requestDeviceGpsLocation}
                      style={{
                        background: '#E11D48',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      📡 Turn On & Allow GPS
                    </button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '10.5px', color: '#94A3B8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <span>📅 {timestampStr}</span>
                <span>🚗 {vehicleReg} • 👨‍✈️ {driverName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 18px',
            background: '#1E293B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #334155',
            gap: '10px',
          }}
        >
          <label
            style={{
              background: '#334155',
              color: '#F8FAFC',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📁 Gallery Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUploadFallback}
              style={{ display: 'none' }}
            />
          </label>

          <Button
            type="button"
            onClick={() => {
              if (!isCameraActive) {
                setShowCameraRequiredPopup(true);
              } else if (!isGpsActive) {
                setShowGpsRequiredPopup(true);
              } else {
                handleCapturePhoto();
              }
            }}
            variant="accent"
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 800,
              background: canSnap ? '#10B981' : '#DC2626',
              borderColor: canSnap ? '#10B981' : '#DC2626',
              color: '#FFFFFF',
              opacity: canSnap ? 1 : 0.75,
              cursor: canSnap ? 'pointer' : 'not-allowed',
              boxShadow: canSnap
                ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                : '0 4px 12px rgba(220, 38, 38, 0.4)',
            }}
          >
            {canSnap
              ? '📸 Snap Geotagged Photo'
              : !isCameraActive && !isGpsActive
              ? '🚫 Turn ON Camera & GPS to Snap Photo'
              : !isCameraActive
              ? '📷 Turn ON Camera Feed to Snap Photo'
              : '📡 Turn ON Device GPS to Snap Photo'}
          </Button>
        </div>

        {/* Popup Alert Modal when Camera is Turned Off / Unavailable */}
        {showCameraRequiredPopup && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.90)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                background: '#1E293B',
                border: '2px solid #EF4444',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '440px',
                width: '100%',
                color: '#F8FAFC',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3)',
              }}
            >
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>📷</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '19px', fontWeight: 900, color: '#EF4444' }}>
                Camera Feed OFF or Permission Blocked!
              </h3>
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px', fontWeight: 600 }}>
                You CANNOT snap or submit geotagged Odometer photos without an active live camera feed.
              </p>

              <div
                style={{
                  background: '#0F172A',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  fontSize: '12px',
                  color: '#94A3B8',
                  textAlign: 'left',
                  marginBottom: '18px',
                  lineHeight: 1.6,
                }}
              >
                <b style={{ color: '#F87171' }}>📷 Step-by-Step Camera Setup:</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li>Tap lock icon 🔒 / 🌐 in browser top address bar ➔ <b>Permissions</b>.</li>
                  <li>Set <b>Camera</b> to <b>Allow</b>.</li>
                  <li>Click <b>"📷 Turn On & Start Camera"</b> below.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCameraRequiredPopup(false);
                    startCamera(facingMode);
                  }}
                  style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  📷 Turn On & Start Camera
                </button>

                <button
                  type="button"
                  onClick={() => setShowCameraRequiredPopup(false)}
                  style={{
                    background: 'transparent',
                    color: '#94A3B8',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popup Alert Modal when GPS is Turned Off */}
        {showGpsRequiredPopup && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.90)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                background: '#1E293B',
                border: '2px solid #F59E0B',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '440px',
                width: '100%',
                color: '#F8FAFC',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '19px', fontWeight: 900, color: '#F59E0B' }}>
                GPS Location Turned Off!
              </h3>
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px', fontWeight: 600 }}>
                You CANNOT snap or approve geotagged Odometer photos until device GPS location is turned ON and coordinates are loaded.
              </p>

              <div
                style={{
                  background: '#0F172A',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  fontSize: '12px',
                  color: '#94A3B8',
                  textAlign: 'left',
                  marginBottom: '18px',
                  lineHeight: 1.6,
                }}
              >
                <b style={{ color: '#FCD34D' }}>📱 Step-by-Step Location Setup:</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li>Swipe down phone notification shade & turn ON <b>Location / GPS</b>.</li>
                  <li>Tap lock icon 🔒 / 🌐 in browser top bar ➔ <b>Permissions</b> ➔ <b>Allow Location</b>.</li>
                  <li>Click <b>"📡 Turn On & Allow Device GPS"</b> below.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowGpsRequiredPopup(false);
                    requestDeviceGpsLocation();
                  }}
                  style={{
                    background: '#F59E0B',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  📡 Turn On & Allow Device GPS
                </button>

                <button
                  type="button"
                  onClick={() => setShowGpsRequiredPopup(false)}
                  style={{
                    background: 'transparent',
                    color: '#94A3B8',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
