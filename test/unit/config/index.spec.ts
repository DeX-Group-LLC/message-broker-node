import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '@config';

// Mock dependencies
jest.mock('fs');
jest.mock('path');

describe('Config', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.resetAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error
        (console.error as jest.Mock).mockRestore();
    });

    it('should throw error when config file cannot be read', () => {
        // Mock fs.readFileSync to throw an error
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('File not found');
        });

        // Mock path.join to return a test path
        (path.join as jest.Mock).mockReturnValue('/test/path/config.yaml');

        // Verify error is thrown and logged
        expect(() => loadConfig('/test/path/config.yaml')).toThrow('File not found');
        expect(console.error).toHaveBeenCalledWith(
            'Error loading configuration:',
            expect.any(Error)
        );
    });

    it('should throw error when config file is invalid YAML', () => {
        // Mock fs.readFileSync to return invalid YAML
        (fs.readFileSync as jest.Mock).mockReturnValue('invalid: yaml: content: {');

        // Mock path.join to return a test path
        (path.join as jest.Mock).mockReturnValue('/test/path/config.yaml');

        // Verify error is thrown and logged
        expect(() => loadConfig('/test/path/config.yaml')).toThrow();
        expect(console.error).toHaveBeenCalledWith(
            'Error loading configuration:',
            expect.any(Error)
        );
    });

    it('should load default config and apply environment variable overrides', () => {
        // Mock default config YAML
        const mockConfig = {
            port: 8080,
            host: 'localhost',
            auth: {
                failure: {
                    lockout: {
                        threshold: 5,
                        duration: 300
                    }
                }
            },
            rate: {
                limit: {
                    global: {
                        per: {
                            service: 1000,
                            topic: 100
                        }
                    }
                }
            },
            connection: {
                max: {
                    concurrent: 1000
                }
            },
            request: {
                response: {
                    timeout: {
                        default: 30000,
                        max: 60000
                    }
                }
            },
            max: {
                outstanding: {
                    requests: 100
                }
            }
        };

        // Mock fs.readFileSync to return valid YAML
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

        // Set environment variables
        const originalEnv = process.env;
        process.env = {
            ...originalEnv,
            PORT: '9090',
            HOST: 'test-host',
            AUTH_FAILURE_LOCKOUT_THRESHOLD: '10',
            AUTH_FAILURE_LOCKOUT_DURATION: '600',
            RATE_LIMIT_GLOBAL_PER_SERVICE: '2000',
            RATE_LIMIT_GLOBAL_PER_TOPIC: '200',
            CONNECTION_MAX_CONCURRENT: '2000',
            REQUEST_RESPONSE_TIMEOUT_DEFAULT: '45000',
            REQUEST_RESPONSE_TIMEOUT_MAX: '90000',
            MAX_OUTSTANDING_REQUESTS: '200'
        };

        // Load config with environment overrides
        const config = loadConfig('/test/path/config.yaml');

        // Verify environment variables override default values
        expect(config.port).toBe(9090);
        expect(config.host).toBe('test-host');
        expect(config.auth.failure.lockout.threshold).toBe(10);
        expect(config.auth.failure.lockout.duration).toBe(600);
        expect(config.rate.limit.global.per.service).toBe(2000);
        expect(config.rate.limit.global.per.topic).toBe(200);
        expect(config.connection.max.concurrent).toBe(2000);
        expect(config.request.response.timeout.default).toBe(45000);
        expect(config.request.response.timeout.max).toBe(90000);
        expect(config.max.outstanding.requests).toBe(200);

        // Restore original environment
        process.env = originalEnv;
    });
});