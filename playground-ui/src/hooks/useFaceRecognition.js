import { useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export const useFaceRecognition = () => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const streamRef = useRef(null);

    // Load face-api.js models from /public/models/
    const loadModels = useCallback(async () => {
        if (modelsLoaded) return;
        setLoading(true);
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        } finally {
            setLoading(false);
        }
    }, [modelsLoaded]);

    // Start webcam stream into a <video> element
    const startWebcam = useCallback(async (videoRef) => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await new Promise((res) => { videoRef.current.onloadedmetadata = res; });
            await videoRef.current.play();
        }
        return stream;
    }, []);

    // Stop webcam stream
    const stopWebcam = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    /**
     * Detect a single face from the video and return its 128-dim descriptor.
     * Returns null if no face found.
     */
    const detectDescriptor = useCallback(async (videoRef) => {
        if (!videoRef.current) return null;
        const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
        return detection ? Array.from(detection.descriptor) : null;
    }, []);

    /**
     * Detect face and draw bounding box on a <canvas> element overlay.
     * Returns the descriptor or null.
     */
    const detectAndDraw = useCallback(async (videoRef, canvasRef) => {
        if (!videoRef.current || !canvasRef.current) return null;
        const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
        canvasRef.current.getContext('2d').clearRect(0, 0, dims.width, dims.height);

        if (detection) {
            const resized = faceapi.resizeResults(detection, dims);
            faceapi.draw.drawDetections(canvasRef.current, resized);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
            return Array.from(detection.descriptor);
        }
        return null;
    }, []);

    /**
     * Match a descriptor against an array of labeled descriptors from backend.
     * @param {number[]} descriptor - The detected descriptor
     * @param {Array<{employeeId, fullName, descriptor: string}>} knownFaces - From backend API
     * @param {number} threshold - Match distance threshold (default 0.4)
     * @returns {{ employeeId: number, fullName: string } | null}
     */
    const matchFace = useCallback((descriptor, knownFaces, threshold = 0.4) => {
        if (!descriptor || !knownFaces || knownFaces.length === 0) return null;

        const labeled = knownFaces
            .filter(f => f.descriptor)
            .map(f => {
                try {
                    const arr = JSON.parse(f.descriptor);
                    return { employeeId: f.employeeId, fullName: f.fullName, descriptor: new Float32Array(arr) };
                } catch { return null; }
            })
            .filter(Boolean);

        if (labeled.length === 0) return null;

        const queryDescriptor = new Float32Array(descriptor);
        let bestMatch = null;
        let bestDist = Infinity;

        for (const known of labeled) {
            const dist = faceapi.euclideanDistance(queryDescriptor, known.descriptor);
            if (dist < bestDist) {
                bestDist = dist;
                bestMatch = known;
            }
        }

        return bestDist <= threshold ? { employeeId: bestMatch.employeeId, fullName: bestMatch.fullName, distance: bestDist } : null;
    }, []);

    /**
     * Verify a descriptor strictly against a specific target descriptor (1:1 verification).
     * Faster and more reliable for authentication than 1:N matching.
     * @param {number[]} descriptor - The detected descriptor
     * @param {string} targetDescriptorStr - JSON string of the target descriptor
     * @param {number} threshold - Match distance threshold (default 0.45 for 1:1)
     * @returns {boolean} true if match, false otherwise
     */
    const verifyFace = useCallback((descriptor, targetDescriptorStr, threshold = 0.45) => {
        if (!descriptor || !targetDescriptorStr) return false;
        try {
            const arr = JSON.parse(targetDescriptorStr);
            const targetDescriptor = new Float32Array(arr);
            const queryDescriptor = new Float32Array(descriptor);
            const dist = faceapi.euclideanDistance(queryDescriptor, targetDescriptor);
            return dist <= threshold;
        } catch {
            return false;
        }
    }, []);

    /**
     * Detect a face from a static <img> element and return its 128-dim descriptor.
     * This is used for photo-based (automated) face registration.
     * @param {HTMLImageElement} imgElement - The image element to scan
     * @returns {number[]|null} descriptor array or null if no face found
     */
    const detectDescriptorFromImage = useCallback(async (imgElement) => {
        if (!imgElement) return null;
        try {
            const detection = await faceapi
                .detectSingleFace(imgElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
            return detection ? Array.from(detection.descriptor) : null;
        } catch (e) {
            console.error('Face detection from image failed:', e);
            return null;
        }
    }, []);

    return { modelsLoaded, loading, loadModels, startWebcam, stopWebcam, detectDescriptor, detectDescriptorFromImage, detectAndDraw, matchFace, verifyFace };
};
