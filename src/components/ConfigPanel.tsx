import React, { useState, useEffect } from 'react';

interface ConfigPanelProps {
    onClose: () => void;
}

interface TabletConfig {
    mqttUrl: string;
    mqttUsername: string;
    mqttPassword: string;
    haUrl: string;
    haDashboard: string;
    screensaver: {
        enabled: boolean;
        timeout: number;
        mode: 'clock' | 'blank' | 'dashboard';
        brightness: number;
    };
    updates: {
        autoUpdate: boolean;
        checkInterval: number;
    };
}

export default function ConfigPanel({ onClose }: ConfigPanelProps) {
    const [pin, setPin] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState<'connection' | 'display' | 'updates' | 'about'>('connection');
    const [config, setConfig] = useState<TabletConfig>({
        mqttUrl: import.meta.env.VITE_MQTT_URL || '',
        mqttUsername: import.meta.env.VITE_MQTT_USERNAME || '',
        mqttPassword: import.meta.env.VITE_MQTT_PASSWORD || '',
        haUrl: import.meta.env.VITE_HA_DASHBOARD_URL?.split('/local')[0] || '',
        haDashboard: import.meta.env.VITE_HA_DASHBOARD_URL?.split('redirect_to=')[1] || '',
        screensaver: {
            enabled: false,
            timeout: 300,
            mode: 'clock',
            brightness: 20
        },
        updates: {
            autoUpdate: import.meta.env.VITE_AUTO_UPDATE === 'true',
            checkInterval: parseInt(import.meta.env.VITE_UPDATE_CHECK_INTERVAL || '3600')
        }
    });
    const [testResult, setTestResult] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    useEffect(() => {
        // Load saved config from localStorage
        const savedConfig = localStorage.getItem('tabletConfig');
        if (savedConfig) {
            try {
                setConfig(JSON.parse(savedConfig));
            } catch (error) {
                console.error('Failed to load saved config:', error);
            }
        }

        // Check if already authenticated this session
        const sessionAuth = sessionStorage.getItem('configAuthenticated');
        if (sessionAuth === 'true') {
            setAuthenticated(true);
        }
    }, []);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Default PIN is 1234, should be configurable
        const correctPin = localStorage.getItem('configPin') || '1234';
        if (pin === correctPin) {
            setAuthenticated(true);
            sessionStorage.setItem('configAuthenticated', 'true');
        } else {
            alert('Incorrect PIN');
            setPin('');
        }
    };

    const handleConfigChange = (field: string, value: any) => {
        setConfig(prev => {
            const newConfig = { ...prev };
            const keys = field.split('.');
            let obj: any = newConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            return newConfig;
        });
    };

    const saveConfig = () => {
        localStorage.setItem('tabletConfig', JSON.stringify(config));
        
        // Send config update via MQTT
        if (window.Ch5MqttBridgeInstance) {
            window.Ch5MqttBridgeInstance.sendMessage('config/update', config);
        }
        
        setTestResult({ type: 'success', message: 'Configuration saved successfully!' });
        setTimeout(() => setTestResult({ type: null, message: '' }), 3000);
    };

    const testMqttConnection = async () => {
        try {
            // Simple connection test
            const mqtt = await import('mqtt');
            const client = mqtt.connect(config.mqttUrl, {
                username: config.mqttUsername,
                password: config.mqttPassword,
                connectTimeout: 5000
            });

            client.on('connect', () => {
                setTestResult({ type: 'success', message: 'MQTT connection successful!' });
                client.end();
            });

            client.on('error', (error) => {
                setTestResult({ type: 'error', message: `Connection failed: ${error.message}` });
                client.end();
            });
        } catch (error) {
            setTestResult({ type: 'error', message: `Test failed: ${error}` });
        }
    };

    const restartApplication = () => {
        if (confirm('Are you sure you want to restart the application?')) {
            window.location.reload();
        }
    };

    if (!authenticated) {
        return (
            <div className="config-panel-overlay">
                <div className="config-panel">
                    <div className="config-header">
                        <h2>Configuration Panel</h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                    <form onSubmit={handlePinSubmit} className="pin-form">
                        <label>Enter PIN to access configuration:</label>
                        <input
                            type="password"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            autoFocus
                        />
                        <button type="submit">Unlock</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="config-panel-overlay">
            <div className="config-panel">
                <div className="config-header">
                    <h2>Tablet Configuration</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="config-tabs">
                    <button className={activeTab === 'connection' ? 'active' : ''} onClick={() => setActiveTab('connection')}>
                        Connection
                    </button>
                    <button className={activeTab === 'display' ? 'active' : ''} onClick={() => setActiveTab('display')}>
                        Display
                    </button>
                    <button className={activeTab === 'updates' ? 'active' : ''} onClick={() => setActiveTab('updates')}>
                        Updates
                    </button>
                    <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>
                        About
                    </button>
                </div>

                <div className="config-content">
                    {activeTab === 'connection' && (
                        <div className="config-section">
                            <h3>MQTT Connection</h3>
                            <div className="config-field">
                                <label>MQTT URL:</label>
                                <input
                                    type="text"
                                    value={config.mqttUrl}
                                    onChange={(e) => handleConfigChange('mqttUrl', e.target.value)}
                                    placeholder="ws://homeassistant.local:8083/mqtt"
                                />
                            </div>
                            <div className="config-field">
                                <label>Username:</label>
                                <input
                                    type="text"
                                    value={config.mqttUsername}
                                    onChange={(e) => handleConfigChange('mqttUsername', e.target.value)}
                                />
                            </div>
                            <div className="config-field">
                                <label>Password:</label>
                                <input
                                    type="password"
                                    value={config.mqttPassword}
                                    onChange={(e) => handleConfigChange('mqttPassword', e.target.value)}
                                />
                            </div>
                            <button onClick={testMqttConnection} className="test-btn">Test Connection</button>

                            <h3>Home Assistant</h3>
                            <div className="config-field">
                                <label>HA URL:</label>
                                <input
                                    type="text"
                                    value={config.haUrl}
                                    onChange={(e) => handleConfigChange('haUrl', e.target.value)}
                                    placeholder="http://homeassistant.local:8123"
                                />
                            </div>
                            <div className="config-field">
                                <label>Dashboard Path:</label>
                                <input
                                    type="text"
                                    value={config.haDashboard}
                                    onChange={(e) => handleConfigChange('haDashboard', e.target.value)}
                                    placeholder="/lovelace/0"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'display' && (
                        <div className="config-section">
                            <h3>Screensaver Settings</h3>
                            <div className="config-field">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.screensaver.enabled}
                                        onChange={(e) => handleConfigChange('screensaver.enabled', e.target.checked)}
                                    />
                                    Enable Screensaver
                                </label>
                            </div>
                            <div className="config-field">
                                <label>Timeout (seconds):</label>
                                <input
                                    type="number"
                                    value={config.screensaver.timeout}
                                    onChange={(e) => handleConfigChange('screensaver.timeout', parseInt(e.target.value))}
                                    min="30"
                                    max="3600"
                                />
                            </div>
                            <div className="config-field">
                                <label>Mode:</label>
                                <select
                                    value={config.screensaver.mode}
                                    onChange={(e) => handleConfigChange('screensaver.mode', e.target.value)}
                                >
                                    <option value="clock">Clock</option>
                                    <option value="blank">Blank</option>
                                    <option value="dashboard">Dashboard</option>
                                </select>
                            </div>
                            <div className="config-field">
                                <label>Brightness (%):</label>
                                <input
                                    type="range"
                                    value={config.screensaver.brightness}
                                    onChange={(e) => handleConfigChange('screensaver.brightness', parseInt(e.target.value))}
                                    min="0"
                                    max="100"
                                />
                                <span>{config.screensaver.brightness}%</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'updates' && (
                        <div className="config-section">
                            <h3>Update Settings</h3>
                            <div className="config-field">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.updates.autoUpdate}
                                        onChange={(e) => handleConfigChange('updates.autoUpdate', e.target.checked)}
                                    />
                                    Enable Auto-Update
                                </label>
                            </div>
                            <div className="config-field">
                                <label>Check Interval (seconds):</label>
                                <input
                                    type="number"
                                    value={config.updates.checkInterval}
                                    onChange={(e) => handleConfigChange('updates.checkInterval', parseInt(e.target.value))}
                                    min="300"
                                    max="86400"
                                />
                            </div>
                            <button onClick={() => window.Ch5MqttBridgeInstance?.updateService?.checkForUpdates()}>
                                Check for Updates Now
                            </button>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="config-section">
                            <h3>System Information</h3>
                            <div className="info-row">
                                <span>Version:</span>
                                <span>{import.meta.env.VITE_APP_VERSION || '4.0.0'}</span>
                            </div>
                            <div className="info-row">
                                <span>Model:</span>
                                <span>{import.meta.env.VITE_TABLET_PROFILE || 'Unknown'}</span>
                            </div>
                            <div className="info-row">
                                <span>Serial:</span>
                                <span>{import.meta.env.VITE_TABLET_SERIAL || 'Unknown'}</span>
                            </div>
                            <div className="info-row">
                                <span>Location:</span>
                                <span>{import.meta.env.VITE_TABLET_LOCATION || 'Unknown'}</span>
                            </div>
                            
                            <h3>Actions</h3>
                            <button onClick={restartApplication} className="danger-btn">
                                Restart Application
                            </button>
                        </div>
                    )}
                </div>

                {testResult.type && (
                    <div className={`test-result ${testResult.type}`}>
                        {testResult.message}
                    </div>
                )}

                <div className="config-footer">
                    <button onClick={saveConfig} className="save-btn">Save Configuration</button>
                    <button onClick={onClose} className="cancel-btn">Cancel</button>
                </div>
            </div>

            <style>{`
                .config-panel-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .config-panel {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .config-header {
                    padding: 20px;
                    background: #2196F3;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .config-header h2 {
                    margin: 0;
                    font-size: 24px;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 30px;
                    cursor: pointer;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                }

                .pin-form {
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .pin-form input {
                    font-size: 24px;
                    padding: 10px;
                    text-align: center;
                    letter-spacing: 10px;
                }

                .config-tabs {
                    display: flex;
                    border-bottom: 1px solid #ddd;
                    background: #f5f5f5;
                }

                .config-tabs button {
                    flex: 1;
                    padding: 15px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 16px;
                }

                .config-tabs button.active {
                    background: white;
                    border-bottom: 2px solid #2196F3;
                    color: #2196F3;
                }

                .config-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }

                .config-section h3 {
                    margin-top: 0;
                    color: #333;
                }

                .config-field {
                    margin-bottom: 15px;
                }

                .config-field label {
                    display: block;
                    margin-bottom: 5px;
                    color: #666;
                }

                .config-field input[type="text"],
                .config-field input[type="password"],
                .config-field input[type="number"],
                .config-field select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 16px;
                }

                .config-field input[type="checkbox"] {
                    margin-right: 10px;
                }

                .config-field input[type="range"] {
                    width: 70%;
                    margin-right: 10px;
                }

                .test-btn, .save-btn {
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 10px;
                }

                .cancel-btn {
                    background: #666;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                }

                .danger-btn {
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 10px;
                }

                .test-result {
                    padding: 10px;
                    margin: 10px 20px;
                    border-radius: 4px;
                }

                .test-result.success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .test-result.error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                .config-footer {
                    padding: 20px;
                    border-top: 1px solid #ddd;
                    display: flex;
                    justify-content: space-between;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }

                .info-row span:first-child {
                    font-weight: bold;
                    color: #666;
                }
            `}</style>
        </div>
    );
}