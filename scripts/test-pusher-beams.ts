#!/usr/bin/env bun
/**
 * Test script for Pusher Beams push notifications
 * 
 * Usage:
 *   bun run scripts/test-pusher-beams.ts
 * 
 * Make sure to set PUSHER_BEAMS_SECRET_KEY environment variable
 */

const INSTANCE_ID = "5700852b-9221-447f-ae85-b9b907f56210";
const INTEREST = "hello";

// Get secret key from environment variable
const SECRET_KEY = process.env.PUSHER_BEAMS_SECRET_KEY;

if (!SECRET_KEY) {
  console.error("❌ Error: PUSHER_BEAMS_SECRET_KEY environment variable is not set");
  console.log("\n📋 To get your secret key:");
  console.log("   1. Go to Pusher Dashboard");
  console.log("   2. Select your Beams instance");
  console.log("   3. Go to 'Credentials' tab");
  console.log("   4. Copy the 'Secret Key'");
  console.log("\n💡 Then run:");
  console.log(`   PUSHER_BEAMS_SECRET_KEY=your_secret_key bun run scripts/test-pusher-beams.ts`);
  process.exit(1);
}

const url = `https://${INSTANCE_ID}.pushnotifications.pusher.com/publish_api/v1/instances/${INSTANCE_ID}/publishes`;

const payload = {
  interests: [INTEREST],
  web: {
    notification: {
      title: "Hello from Pusher Beams! 👋",
      body: "This is a test notification. If you see this, Pusher Beams is working!",
      icon: "https://pusher.com/favicon.ico",
      deep_link: "https://os.ryo.lu",
    },
  },
};

console.log("🚀 Sending test push notification...");
console.log(`📡 Instance ID: ${INSTANCE_ID}`);
console.log(`🎯 Interest: ${INTEREST}`);
console.log(`📝 Message: ${payload.web.notification.body}`);
console.log("");

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Failed to send notification");
    console.error(`   Status: ${response.status} ${response.statusText}`);
    console.error(`   Response: ${errorText}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log("✅ Notification sent successfully!");
  console.log(`   Publish ID: ${result.publishId}`);
  console.log("");
  console.log("📱 Check your browser - you should see a notification!");
  console.log("   (Make sure notification permission is granted)");
} catch (error) {
  console.error("❌ Error sending notification:", error);
  if (error instanceof Error) {
    console.error(`   ${error.message}`);
  }
  process.exit(1);
}

