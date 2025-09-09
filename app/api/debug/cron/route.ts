import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST } from '@/lib/utils';

export async function GET() {
  try {
    logger.info('🧪 Testing cron functionality...', 'debug-cron');
    
    const now = getCurrentTimeInIST();
    
    // Test both endpoints
    const results = {
      timestamp: now.toISOString(),
      currentET: now.toLocaleString(),
      environment: process.env.NODE_ENV,
      cronSecret: process.env.CRON_SECRET ? 'Present' : 'Missing',
      tests: {
        autoPost: '/api/auto-post',
        generate: '/api/generate'
      }
    };

    logger.info('✅ Cron test completed', 'debug-cron');
    
    return NextResponse.json({
      success: true,
      message: 'Cron test endpoint working',
      results
    });

  } catch (error) {
    logger.error('Cron test failed:', 'debug-cron', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Cron test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { endpoint, secret, method = 'GET', body } = await request.json();
    
    logger.info(`🧪 Testing cron endpoint: ${endpoint} with method ${method}`, 'debug-cron');
    
    // Simulate cron authorization header
    const headers = {
      'Authorization': `Bearer ${secret || process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    };
    
    const baseUrl = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const testUrl = `${protocol}://${baseUrl}${endpoint}`;
    
    logger.info(`📡 Making request to: ${testUrl}`, 'debug-cron');
    
    const response = await fetch(testUrl, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const result = await response.json();
    
    logger.info(`📋 Response status: ${response.status}`, 'debug-cron');
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      endpoint: testUrl,
      result
    });

  } catch (error) {
    logger.error('❌ Manual cron test failed:', 'debug-cron', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Manual cron test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}