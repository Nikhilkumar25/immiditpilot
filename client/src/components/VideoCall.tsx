import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2 } from 'lucide-react';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Open Relay free TURN servers (publicly documented credentials)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:80?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turns:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
    iceCandidatePoolSize: 10,
};

interface VideoCallProps {
    targetUserId?: string;
    targetName?: string;
    serviceId?: string;
    incomingCall?: {
        callerId: string;
        callerName: string;
        callerRole: string;
        serviceId: string;
        offer: RTCSessionDescriptionInit;
    } | null;
    callerName?: string;
    onClose: () => void;
}

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export default function VideoCall({ targetUserId, targetName, serviceId, incomingCall, callerName, onClose }: VideoCallProps) {
    const { socket } = useSocket();
    const [callState, setCallState] = useState<CallState>(incomingCall ? 'ringing' : 'idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [duration, setDuration] = useState(0);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const remoteUserIdRef = useRef<string>('');
    const timerRef = useRef<number | null>(null);
    // Buffer ICE candidates that arrive before peer connection is ready
    const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
    const hasInitiated = useRef(false);

    const cleanup = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        remoteStreamRef.current = null;
        iceCandidateBuffer.current = [];
    }, []);

    const startTimer = useCallback(() => {
        setDuration(0);
        timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    }, []);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // Attach remote stream to video element — called whenever the ref or stream is available
    const attachRemoteStream = useCallback((stream: MediaStream) => {
        remoteStreamRef.current = stream;
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play().catch(() => { /* autoplay blocked, user interaction needed */ });
        }
    }, []);

    const createPeerConnection = useCallback((remoteUserId: string) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        remoteUserIdRef.current = remoteUserId;

        pc.onicecandidate = (e) => {
            if (e.candidate && socket) {
                socket.emit('call_ice_candidate', {
                    targetUserId: remoteUserId,
                    candidate: e.candidate.toJSON(),
                });
            }
        };

        pc.ontrack = (e) => {
            console.log('📹 Remote track received:', e.track.kind);
            if (e.streams[0]) {
                attachRemoteStream(e.streams[0]);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('🧊 ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setCallState('connected');
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setCallState('connected');
                startTimer();
            } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                setCallState('ended');
            }
        };

        pcRef.current = pc;

        // Flush any buffered ICE candidates
        if (iceCandidateBuffer.current.length > 0) {
            console.log(`🧊 Flushing ${iceCandidateBuffer.current.length} buffered ICE candidates`);
            iceCandidateBuffer.current.forEach(candidate => {
                pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err =>
                    console.warn('Failed to add buffered ICE candidate:', err)
                );
            });
            iceCandidateBuffer.current = [];
        }

        return pc;
    }, [socket, startTimer, attachRemoteStream]);

    // Initiate a call (caller side)
    const initiateCall = useCallback(async () => {
        if (!socket || !targetUserId || !serviceId || hasInitiated.current) return;
        hasInitiated.current = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = createPeerConnection(targetUserId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_initiate', {
                targetUserId,
                serviceId,
                offer: { type: offer.type, sdp: offer.sdp },
                callerName: callerName || 'Doctor',
            });

            setCallState('calling');
        } catch (err) {
            console.error('Failed to start call:', err);
            setCallState('ended');
        }
    }, [socket, targetUserId, serviceId, callerName, createPeerConnection]);

    // Accept an incoming call (receiver side)
    const acceptCall = useCallback(async () => {
        if (!socket || !incomingCall) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = createPeerConnection(incomingCall.callerId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call_answer', {
                targetUserId: incomingCall.callerId,
                answer: { type: answer.type, sdp: answer.sdp },
            });

            setCallState('connected');
            startTimer();
        } catch (err) {
            console.error('Failed to accept call:', err);
            setCallState('ended');
        }
    }, [socket, incomingCall, createPeerConnection, startTimer]);

    // End / Decline
    const endCall = useCallback(() => {
        if (socket && remoteUserIdRef.current) {
            socket.emit('call_end', { targetUserId: remoteUserIdRef.current });
        } else if (socket && incomingCall) {
            socket.emit('call_decline', { targetUserId: incomingCall.callerId });
        }
        cleanup();
        setCallState('ended');
        setTimeout(onClose, 1200);
    }, [socket, incomingCall, cleanup, onClose]);

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
            setIsMuted(prev => !prev);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
            setIsVideoOff(prev => !prev);
        }
    };

    // Socket event listeners — always active, buffer ICE if PC not ready
    useEffect(() => {
        if (!socket) return;

        const onCallAnswered = async (data: { answererId: string; answer: RTCSessionDescriptionInit }) => {
            console.log('📞 Call answered, setting remote description');
            if (pcRef.current) {
                try {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                    console.error('Failed to set remote description:', err);
                }
            }
        };

        const onIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
            if (!data.candidate) return;

            if (pcRef.current && pcRef.current.remoteDescription) {
                // PC is ready, add directly
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.warn('Failed to add ICE candidate:', err);
                }
            } else {
                // Buffer it — PC not ready yet (still ringing)
                console.log('🧊 Buffering ICE candidate (PC not ready)');
                iceCandidateBuffer.current.push(data.candidate);
            }
        };

        const onCallEnded = () => {
            cleanup();
            setCallState('ended');
            setTimeout(onClose, 1200);
        };

        const onCallDeclined = () => {
            cleanup();
            setCallState('ended');
            setTimeout(onClose, 1200);
        };

        socket.on('call_answered', onCallAnswered);
        socket.on('call_ice_candidate', onIceCandidate);
        socket.on('call_ended', onCallEnded);
        socket.on('call_declined', onCallDeclined);

        return () => {
            socket.off('call_answered', onCallAnswered);
            socket.off('call_ice_candidate', onIceCandidate);
            socket.off('call_ended', onCallEnded);
            socket.off('call_declined', onCallDeclined);
        };
    }, [socket, cleanup, onClose]);

    // Auto-initiate if caller
    useEffect(() => {
        if (!incomingCall && targetUserId && callState === 'idle') {
            initiateCall();
        }
    }, [incomingCall, targetUserId, callState, initiateCall]);

    // Re-attach remote stream when ref becomes available (e.g. transition from ringing → connected)
    useEffect(() => {
        if (remoteStreamRef.current && remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => { });
        }
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => { cleanup(); };
    }, [cleanup]);

    // ==================== RENDER ====================

    // Ringing overlay (incoming call)
    if (callState === 'ringing') {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), hsl(174, 62%, 35%))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'vcPulse 1.5s infinite',
                }}>
                    <Phone size={36} color="white" />
                </div>
                <div style={{ color: 'white', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Incoming Video Call</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: 4 }}>
                        {incomingCall?.callerName} ({incomingCall?.callerRole})
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 32 }}>
                    <button onClick={endCall} style={{
                        width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: '#dc3545', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <PhoneOff size={28} />
                    </button>
                    <button onClick={acceptCall} style={{
                        width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: '#28a745', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'vcPulse 1.5s infinite',
                    }}>
                        <Phone size={28} />
                    </button>
                </div>
                <style>{`@keyframes vcPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
            </div>
        );
    }

    // Minimized PIP
    if (isMinimized && callState === 'connected') {
        return (
            <div style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 9998, width: 180, height: 130,
                borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                border: '2px solid var(--primary)', cursor: 'pointer',
            }}
                onClick={() => setIsMinimized(false)}
            >
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
                <div style={{
                    position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center',
                    fontSize: '0.688rem', color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}>
                    {formatDuration(duration)} — Tap to expand
                </div>
            </div>
        );
    }

    // Main call UI
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: '#111',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Remote video */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{
                    width: '100%', height: '100%', objectFit: 'cover', background: '#000',
                }} />

                {callState !== 'connected' && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)',
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), hsl(174, 62%, 35%))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                            animation: callState === 'calling' ? 'vcPulse 1.5s infinite' : undefined,
                        }}>
                            <Phone size={28} color="white" />
                        </div>
                        <div style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                            {callState === 'calling' && `Calling ${targetName || 'Nurse'}...`}
                            {callState === 'ended' && 'Call Ended'}
                        </div>
                    </div>
                )}

                {/* Top bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
                        {targetName || incomingCall?.callerName || 'Video Call'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {callState === 'connected' && (
                            <span style={{ color: '#28a745', fontSize: '0.813rem', fontWeight: 600 }}>
                                🟢 {formatDuration(duration)}
                            </span>
                        )}
                        <button onClick={() => setIsMinimized(true)} style={{
                            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
                            padding: 6, cursor: 'pointer', color: 'white',
                        }}>
                            <Minimize2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Local video PIP */}
                <div style={{
                    position: 'absolute', bottom: 100, right: 16, width: 120, height: 160,
                    borderRadius: 10, overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.3)',
                }}>
                    <video ref={localVideoRef} autoPlay playsInline muted style={{
                        width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', background: '#000',
                    }} />
                </div>
            </div>

            {/* Controls */}
            <div style={{
                padding: '16px 24px', background: '#1a1a1a',
                display: 'flex', justifyContent: 'center', gap: 20, flexShrink: 0,
            }}>
                <button onClick={toggleMute} style={{
                    width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: isMuted ? '#dc3545' : 'rgba(255,255,255,0.15)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <button onClick={toggleVideo} style={{
                    width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: isVideoOff ? '#dc3545' : 'rgba(255,255,255,0.15)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
                <button onClick={endCall} style={{
                    width: 60, height: 50, borderRadius: 25, border: 'none', cursor: 'pointer',
                    background: '#dc3545', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <PhoneOff size={24} />
                </button>
            </div>

            <style>{`@keyframes vcPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
        </div>
    );
}
