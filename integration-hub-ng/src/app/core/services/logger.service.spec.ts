import { TestBed } from '@angular/core/testing';
import { LoggerService, LogLevel } from './logger.service';
import { environment } from '../../../environments/environment';

describe('LoggerService', () => {
  let service: LoggerService;
  let originalEnv: typeof environment;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoggerService);
    
    // Store original environment
    originalEnv = { ...environment };
    
    // Spy on console methods
    spyOn(console, 'debug');
    spyOn(console, 'info');
    spyOn(console, 'warn');
    spyOn(console, 'error');
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(environment, originalEnv);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log debug messages in development', () => {
    Object.assign(environment, { production: false });
    const service = new LoggerService();
    
    service.debug('Test debug message');
    expect(console.debug).toHaveBeenCalledWith('[DEBUG] Test debug message');
  });

  it('should log info messages', () => {
    service.info('Test info message');
    expect(console.info).toHaveBeenCalledWith('[INFO] Test info message');
  });

  it('should log warn messages', () => {
    service.warn('Test warn message');
    expect(console.warn).toHaveBeenCalledWith('[WARN] Test warn message');
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    service.error('Test error message', error);
    expect(console.error).toHaveBeenCalledWith('[ERROR] Test error message', error);
  });

  it('should respect log level settings', () => {
    service.setLogLevel(LogLevel.ERROR);
    
    service.debug('Should not log');
    service.info('Should not log');
    service.warn('Should not log');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    
    service.error('Should log');
    expect(console.error).toHaveBeenCalled();
  });

  it('should accept additional arguments', () => {
    service.info('Message', { key: 'value' }, 'extra');
    expect(console.info).toHaveBeenCalledWith('[INFO] Message', { key: 'value' }, 'extra');
  });
});

