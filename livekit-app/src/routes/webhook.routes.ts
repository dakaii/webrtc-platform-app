import { Router, Request, Response, NextFunction } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { config } from '../config';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse, WebhookEvent } from '../types';

const router = Router();

// Initialize webhook receiver
const webhookReceiver = new WebhookReceiver(
  config.livekit.apiKey,
  config.livekit.apiSecret
);

/**
 * Handle LiveKit webhooks
 * POST /api/webhooks/livekit
 */
router.post('/livekit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.get('Authorization') || '';

    // Verify the webhook signature
    let event;
    try {
      event = await webhookReceiver.receive(rawBody, signature);
    } catch (error) {
      return next(new AppError('Invalid webhook signature', 401));
    }

    // Process the webhook event
    console.log(`Received webhook event: ${event.event}`, event);

    // Handle different event types
    switch (event.event) {
      case 'room_started':
        console.log(`Room started: ${event.room?.name}`);
        break;
      
      case 'room_finished':
        console.log(`Room finished: ${event.room?.name}`);
        break;
      
      case 'participant_joined':
        console.log(`Participant joined: ${event.participant?.identity} in room ${event.room?.name}`);
        break;
      
      case 'participant_left':
        console.log(`Participant left: ${event.participant?.identity} from room ${event.room?.name}`);
        break;
      
      case 'track_published':
        console.log(`Track published: ${event.track?.sid} by ${event.participant?.identity}`);
        break;
      
      case 'track_unpublished':
        console.log(`Track unpublished: ${event.track?.sid} by ${event.participant?.identity}`);
        break;
      
      case 'egress_started':
        console.log(`Egress started: ${event.egressInfo?.egressId}`);
        break;
      
      case 'egress_ended':
        console.log(`Egress ended: ${event.egressInfo?.egressId}`);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    // In a production application, you would typically:
    // 1. Store event data in a database
    // 2. Update application state
    // 3. Send notifications to users
    // 4. Trigger other business logic

    // Send success response
    const response: ApiResponse = {
      success: true,
      data: { received: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to process webhook',
      500
    ));
  }
});

/**
 * Get webhook event types
 * GET /api/webhooks/events
 */
router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventTypes = [
      'room_started',
      'room_finished',
      'participant_joined',
      'participant_left',
      'track_published',
      'track_unpublished',
      'egress_started',
      'egress_ended',
    ];

    const response: ApiResponse = {
      success: true,
      data: eventTypes,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to get event types',
      500
    ));
  }
});

export default router;