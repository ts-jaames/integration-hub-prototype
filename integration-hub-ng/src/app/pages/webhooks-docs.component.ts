import { Component } from '@angular/core';

@Component({
  selector: 'app-webhooks-docs',
  standalone: false,
  template: `
    <app-doc-layout>
      <h1>Webhooks</h1>
      
      <p>
        Webhooks allow you to receive real-time notifications about events in your LUMEN integration. 
        Instead of polling for updates, LUMEN will send HTTP POST requests to your configured endpoint 
        whenever specific events occur.
      </p>
      
      <div class="callout">
        <p><strong>Note:</strong> Webhooks require a publicly accessible HTTPS endpoint. Local development 
        can use tools like ngrok or localtunnel to expose local servers.</p>
      </div>
      
      <h2 id="how-it-works">How it works</h2>
      
      <p>
        When you create a webhook, you provide a URL endpoint and select which events you want to receive. 
        LUMEN will send a POST request to your endpoint whenever one of those events occurs.
      </p>
      
      <p>
        Each webhook payload includes:
      </p>
      
      <ul>
        <li>Event type and timestamp</li>
        <li>Event data specific to the event type</li>
        <li>Webhook signature for verification</li>
        <li>Unique event ID for idempotency</li>
      </ul>
      
      <h3 id="event-types">Event types</h3>
      
      <p>
        LUMEN supports the following event types:
      </p>
      
      <table>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Description</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>api.created</code></td>
            <td>Triggered when a new API is registered</td>
            <td>API object</td>
          </tr>
          <tr>
            <td><code>api.updated</code></td>
            <td>Triggered when an API configuration changes</td>
            <td>API object</td>
          </tr>
          <tr>
            <td><code>api.deleted</code></td>
            <td>Triggered when an API is removed</td>
            <td>API ID</td>
          </tr>
          <tr>
            <td><code>user.invited</code></td>
            <td>Triggered when a user is invited</td>
            <td>User object</td>
          </tr>
          <tr>
            <td><code>user.removed</code></td>
            <td>Triggered when a user is removed</td>
            <td>User ID</td>
          </tr>
          <tr>
            <td><code>alert.triggered</code></td>
            <td>Triggered when a system alert is raised</td>
            <td>Alert object</td>
          </tr>
        </tbody>
      </table>
      
      <h2 id="create-webhook">Create a webhook</h2>
      
      <p>
        To create a webhook, send a POST request to the webhooks endpoint:
      </p>
      
      <app-code-block [code]="createWebhookCode"></app-code-block>
      
      <h3 id="webhook-configuration">Webhook configuration</h3>
      
      <p>
        The webhook configuration includes:
      </p>
      
      <ul>
        <li><strong>url</strong>: The HTTPS endpoint where events will be sent</li>
        <li><strong>events</strong>: Array of event types to subscribe to</li>
        <li><strong>secret</strong>: Secret key used to sign webhook payloads</li>
        <li><strong>active</strong>: Boolean to enable/disable the webhook (default: true)</li>
      </ul>
      
      <h3 id="webhook-secret">Webhook secret</h3>
      
      <p>
        The webhook secret is used to verify that requests are coming from LUMEN. 
        Store this securely and use it to verify the signature in each webhook payload.
      </p>
      
      <div class="callout">
        <p><strong>Security:</strong> Never expose your webhook secret in client-side code or 
        public repositories. Always verify webhook signatures before processing events.</p>
      </div>
      
      <h2 id="webhook-payload">Webhook payload</h2>
      
      <p>
        Each webhook request includes a JSON payload with the following structure:
      </p>
      
      <app-code-block [code]="webhookPayloadCode"></app-code-block>
      
      <h3 id="payload-fields">Payload fields</h3>
      
      <ul>
        <li><strong>id</strong>: Unique event identifier (use for idempotency)</li>
        <li><strong>type</strong>: Event type (e.g., "api.created")</li>
        <li><strong>timestamp</strong>: ISO 8601 timestamp of when the event occurred</li>
        <li><strong>data</strong>: Event-specific data object</li>
        <li><strong>signature</strong>: HMAC SHA-256 signature of the payload</li>
      </ul>
      
      <h2 id="verify-webhooks">Verify webhooks</h2>
      
      <p>
        To verify that a webhook request is authentic, compute the HMAC SHA-256 signature 
        of the request body using your webhook secret and compare it to the signature header.
      </p>
      
      <app-code-block [code]="verifyWebhookCode"></app-code-block>
      
      <h2 id="delete-webhook">Delete a webhook</h2>
      
      <p>
        To delete a webhook, send a DELETE request:
      </p>
      
      <app-code-block [code]="deleteWebhookCode"></app-code-block>
      
      <p>
        Once deleted, the webhook will stop receiving events immediately. 
        Any in-flight requests will complete, but no new events will be sent.
      </p>
      
      <h2 id="best-practices">Best practices</h2>
      
      <h3 id="idempotency">Idempotency</h3>
      
      <p>
        Use the event <code>id</code> field to ensure you don't process the same event twice. 
        Store processed event IDs and check against them before processing.
      </p>
      
      <h3 id="error-handling">Error handling</h3>
      
      <p>
        Your endpoint should return a 2xx status code within 5 seconds. If LUMEN doesn't 
        receive a successful response, it will retry the webhook with exponential backoff.
      </p>
      
      <h3 id="rate-limiting">Rate limiting</h3>
      
      <p>
        Webhook endpoints are subject to rate limits. If you exceed the limit, 
        LUMEN will queue events and retry later. Monitor your endpoint's performance 
        to avoid delays in event processing.
      </p>
      
      <h2 id="testing">Testing webhooks</h2>
      
      <p>
        Use the webhook testing tool in the LUMEN dashboard to send test events to your endpoint. 
        This allows you to verify your endpoint's behavior without waiting for real events.
      </p>
      
      <div class="callout">
        <p><strong>Tip:</strong> Use a webhook testing service like webhook.site or requestbin 
        during development to inspect incoming webhook payloads.</p>
      </div>
    </app-doc-layout>
  `,
  styles: [`
    // Styles are handled by doc-layout component
  `]
})
export class WebhooksDocsComponent {
  createWebhookCode = `POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/lumen",
  "events": ["api.created", "api.updated", "alert.triggered"],
  "secret": "your-webhook-secret"
}`;

  webhookPayloadCode = `{
  "id": "evt_1234567890",
  "type": "api.created",
  "timestamp": "2024-11-06T14:32:00Z",
  "data": {
    "id": "api_abc123",
    "name": "Customer API",
    "version": "v2.1",
    "status": "active"
  },
  "signature": "sha256=abc123..."
}`;

  verifyWebhookCode = `import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}`;

  deleteWebhookCode = `DELETE /api/v1/webhooks/{webhook_id}`;
}

