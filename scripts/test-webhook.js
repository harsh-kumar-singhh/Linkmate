const crypto = require('crypto');

async function testWebhook() {
    const secret = 'test_secret'; // Match your RAZORPAY_WEBHOOK_SECRET
    const payload = {
        event: 'subscription.activated',
        payload: {
            subscription: {
                entity: {
                    id: 'sub_test_123',
                    notes: {
                        userId: 'user_id_here' // Replace with a valid user ID from your DB
                    }
                }
            }
        }
    };

    const body = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    console.log('Test Payload (body):', body);
    console.log('Generated Signature:', signature);
    console.log('URL: http://localhost:3000/api/razorpay/webhook');
    console.log('Header: x-razorpay-signature: ' + signature);
}

testWebhook();
