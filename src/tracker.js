export class Tracker {
    constructor() {
        this.watchId = null;
        this.wakeLock = null;
        this.callbacks = [];
        this.lastSpeed = 0;
    }

    onUpdate(callback) {
        this.callbacks.push(callback);
    }

    notify(data) {
        this.callbacks.forEach(cb => cb(data));
    }

    async start() {
        if (!('geolocation' in navigator)) {
            this.notify({ error: 'Geolocation not supported' });
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

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
        this.releaseWakeLock();
    }

    handlePosition(position) {
        const { speed, accuracy, heading } = position.coords;
        // speed is in m/s. Return null if speed is null (stationary/unknown).
        // If speed is null, standardized to 0 for display.
        const currentSpeed = speed === null ? 0 : speed;

        this.notify({
            speed: currentSpeed, // m/s
            accuracy, // meters
            heading,
            timestamp: position.timestamp,
            error: null
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
                console.log('Wake Lock active');
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
}
