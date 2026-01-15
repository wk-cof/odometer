export class Tracker {
    constructor() {
        this.watchId = null;
        this.wakeLock = null;
        this.callbacks = [];
        this.lastPosition = null;
        this.lastSpeed = 0;
    }

    onUpdate(callback) {
        this.callbacks.push(callback);
    }

    notify(data) {
        this.callbacks.forEach(cb => cb(data));
    }

    async checkPermission() {
        if (!('geolocation' in navigator)) return 'denied';
        if ('permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                return result.state;
            } catch (e) {
                return 'prompt';
            }
        }
        return 'prompt';
    }

    async start() {
        if (!('geolocation' in navigator)) {
            this.notify({ error: 'Geolocation not supported' });
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.stop();

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            options
        );

        this.requestWakeLock();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.requestWakeLock();
            }
        });
    }

    stop() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.lastPosition = null;
        this.releaseWakeLock();
    }

    handlePosition(position) {
        const { latitude, longitude, speed, accuracy, heading } = position.coords;
        const timestamp = position.timestamp;

        // Native speed is best if available and reliable (> 0)
        let finalSpeed = speed;

        // If native speed is missing or 0, try manual calculation
        if ((speed === null || speed === 0) && this.lastPosition) {
            const dist = this.getDistanceFromLatLonInMeters(
                this.lastPosition.latitude,
                this.lastPosition.longitude,
                latitude,
                longitude
            );

            const timeDiff = (timestamp - this.lastPosition.timestamp) / 1000; // seconds

            // Filtering: Only calculate speed if moved significantly relative to accuracy
            // This prevents "jitter speed" when standing still
            // We require movement > accuracy for reliable dead reckoning
            if (timeDiff > 0 && dist > accuracy) {
                finalSpeed = dist / timeDiff;
            }
        }

        // Apply slight smoothing if we have a previous speed
        // (Simple Low-pass filter: 70% new, 30% old)
        if (finalSpeed !== null) {
            // this.lastSpeed = (finalSpeed * 0.7) + (this.lastSpeed * 0.3);
            this.lastSpeed = finalSpeed; // Disable smoothing for responsiveness for now
        } else {
            this.lastSpeed = 0;
        }

        // Store this position for next time
        this.lastPosition = {
            latitude,
            longitude,
            timestamp,
            accuracy
        };

        this.notify({
            speed: this.lastSpeed,
            accuracy,
            heading,
            timestamp,
            error: null,
            status: 'active'
        });
    }

    handleError(error) {
        let msg = 'Unknown error';
        switch (error.code) {
            case error.PERMISSION_DENIED: msg = 'Permission denied'; break;
            case error.POSITION_UNAVAILABLE: msg = 'Signal lost'; break;
            case error.TIMEOUT: msg = 'Waiting for GPS...'; break;
        }
        this.notify({ error: msg });
    }

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.warn(`Wake Lock failed: ${err.name}, ${err.message}`);
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock !== null) {
            await this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    // Helper: Haversine Formula
    getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d;
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}
