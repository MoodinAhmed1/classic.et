import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle different Chapa webhook events
    switch (body.event) {
      case 'payment_success':
        // Handle successful payment
        console.log('Payment successful:', body.data);
        break;
      case 'payment_failed':
        // Handle failed payment
        console.log('Payment failed:', body.data);
        break;
      default:
        console.log('Unhandled webhook event:', body.event);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Chapa webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
