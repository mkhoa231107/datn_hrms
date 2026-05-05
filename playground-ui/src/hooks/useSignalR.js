import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = 'http://localhost:5052/hubs/hrms';

/**
 * useSignalR - Custom hook to connect to HRMS SignalR hub and listen for events.
 * 
 * @param {Object} options
 * @param {Function} options.onNotification - Callback when a new notification arrives
 * @param {Function} options.onAttendanceUpdate - Callback for attendance check-in/out events
 * @param {Function} options.onDashboardRefresh - Callback to trigger dashboard refresh
 * @param {Function} options.onLeaveStatusUpdate - Callback for leave approval/rejection
 * @param {boolean} options.enabled - Whether to connect (default true)
 */
export function useSignalR({
    onNotification,
    onAttendanceUpdate,
    onDashboardRefresh,
    onLeaveStatusUpdate,
    enabled = true,
} = {}) {
    const connectionRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const getToken = useCallback(() => {
        return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    }, []);

    const connect = useCallback(async () => {
        if (!enabled || !getToken()) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => getToken(),
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
                skipNegotiation: false,
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // === EVENT LISTENERS ===

        // 🔔 Thông báo mới (cá nhân)
        if (onNotification) {
            connection.on('ReceiveNotification', (notification) => {
                onNotification(notification);
            });
        }

        // ⏰ Check-in / Check-out mới (toàn hệ thống)
        if (onAttendanceUpdate) {
            connection.on('AttendanceUpdated', (record) => {
                onAttendanceUpdate(record);
            });
        }

        // 📊 Yêu cầu refresh dashboard (từ manager action)
        if (onDashboardRefresh) {
            connection.on('DashboardRefresh', () => {
                onDashboardRefresh();
            });
        }

        // 📋 Cập nhật trạng thái đơn nghỉ
        if (onLeaveStatusUpdate) {
            connection.on('LeaveStatusUpdated', (data) => {
                onLeaveStatusUpdate(data);
            });
        }

        connection.onreconnecting(() => {
            console.log('[SignalR] Reconnecting...');
        });

        connection.onreconnected(() => {
            console.log('[SignalR] Reconnected!');
        });

        connection.onclose(() => {
            console.log('[SignalR] Connection closed.');
        });

        try {
            await connection.start();
            console.log('[SignalR] Connected to HRMS Hub.');
            connectionRef.current = connection;
        } catch (err) {
            console.warn('[SignalR] Failed to connect:', err.message);
        }
    }, [enabled, getToken, onNotification, onAttendanceUpdate, onDashboardRefresh, onLeaveStatusUpdate]);

    useEffect(() => {
        connect();

        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
            }
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
        };
    }, [connect]);

    return {
        connection: connectionRef.current,
        isConnected: connectionRef.current?.state === signalR.HubConnectionState.Connected,
    };
}
