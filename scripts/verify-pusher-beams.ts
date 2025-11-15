#!/usr/bin/env bun
/**
 * Verification script for Pusher Beams setup
 * Checks if all required files and configurations are in place
 */

import { existsSync } from "fs";
import { readFileSync } from "fs";
import { join } from "path";

const projectRoot = process.cwd();

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

// Check 1: Service Worker file exists
const serviceWorkerPath = join(projectRoot, "public", "service-worker.js");
if (existsSync(serviceWorkerPath)) {
  const content = readFileSync(serviceWorkerPath, "utf-8");
  if (content.includes("pusher.com/beams/service-worker.js")) {
    checks.push({
      name: "Service Worker File",
      passed: true,
      message: "✓ service-worker.js exists and contains Pusher Beams import",
    });
  } else {
    checks.push({
      name: "Service Worker File",
      passed: false,
      message: "✗ service-worker.js exists but missing Pusher Beams import",
    });
  }
} else {
  checks.push({
    name: "Service Worker File",
    passed: false,
    message: "✗ service-worker.js not found in public/",
  });
}

// Check 2: SDK script tag in index.html
const indexHtmlPath = join(projectRoot, "index.html");
if (existsSync(indexHtmlPath)) {
  const content = readFileSync(indexHtmlPath, "utf-8");
  if (content.includes("pusher.com/beams/2.1.0/push-notifications-cdn.js")) {
    checks.push({
      name: "SDK Script Tag",
      passed: true,
      message: "✓ Pusher Beams SDK script tag found in index.html",
    });
  } else {
    checks.push({
      name: "SDK Script Tag",
      passed: false,
      message: "✗ Pusher Beams SDK script tag not found in index.html",
    });
  }
} else {
  checks.push({
    name: "SDK Script Tag",
    passed: false,
    message: "✗ index.html not found",
  });
}

// Check 3: Pusher Beams utility file exists
const pusherBeamsPath = join(projectRoot, "src", "utils", "pusherBeams.ts");
if (existsSync(pusherBeamsPath)) {
  const content = readFileSync(pusherBeamsPath, "utf-8");
  if (content.includes("initializePusherBeams")) {
    checks.push({
      name: "Pusher Beams Utils",
      passed: true,
      message: "✓ pusherBeams.ts exists with initializePusherBeams function",
    });
  } else {
    checks.push({
      name: "Pusher Beams Utils",
      passed: false,
      message: "✗ pusherBeams.ts exists but missing initializePusherBeams",
    });
  }
} else {
  checks.push({
    name: "Pusher Beams Utils",
    passed: false,
    message: "✗ pusherBeams.ts not found in src/utils/",
  });
}

// Check 4: Service Worker registration utility exists
const serviceWorkerUtilsPath = join(
  projectRoot,
  "src",
  "utils",
  "serviceWorker.ts"
);
if (existsSync(serviceWorkerUtilsPath)) {
  const content = readFileSync(serviceWorkerUtilsPath, "utf-8");
  if (content.includes("registerServiceWorker")) {
    checks.push({
      name: "Service Worker Utils",
      passed: true,
      message: "✓ serviceWorker.ts exists with registerServiceWorker function",
    });
  } else {
    checks.push({
      name: "Service Worker Utils",
      passed: false,
      message: "✗ serviceWorker.ts exists but missing registerServiceWorker",
    });
  }
} else {
  checks.push({
    name: "Service Worker Utils",
    passed: false,
    message: "✗ serviceWorker.ts not found in src/utils/",
  });
}

// Check 5: App.tsx imports and uses Pusher Beams
const appTsxPath = join(projectRoot, "src", "App.tsx");
if (existsSync(appTsxPath)) {
  const content = readFileSync(appTsxPath, "utf-8");
  const hasImport = content.includes("initializePusherBeams");
  const hasUsage = content.includes("initializePusherBeams(");
  if (hasImport && hasUsage) {
    checks.push({
      name: "App Integration",
      passed: true,
      message: "✓ App.tsx imports and uses initializePusherBeams",
    });
  } else if (hasImport && !hasUsage) {
    checks.push({
      name: "App Integration",
      passed: false,
      message: "✗ App.tsx imports but doesn't use initializePusherBeams",
    });
  } else {
    checks.push({
      name: "App Integration",
      passed: false,
      message: "✗ App.tsx doesn't import initializePusherBeams",
    });
  }
} else {
  checks.push({
    name: "App Integration",
    passed: false,
    message: "✗ App.tsx not found",
  });
}

// Check 6: Instance ID is configured
if (existsSync(appTsxPath)) {
  const content = readFileSync(appTsxPath, "utf-8");
  if (content.includes("5700852b-9221-447f-ae85-b9b907f56210")) {
    checks.push({
      name: "Instance ID Configuration",
      passed: true,
      message: "✓ Instance ID found in App.tsx",
    });
  } else {
    checks.push({
      name: "Instance ID Configuration",
      passed: false,
      message: "✗ Instance ID not found in App.tsx",
    });
  }
}

// Print results
console.log("\n🔍 Pusher Beams Setup Verification\n");
console.log("=" .repeat(50));

let allPassed = true;
checks.forEach((check) => {
  console.log(check.message);
  if (!check.passed) {
    allPassed = false;
  }
});

console.log("=" .repeat(50));

if (allPassed) {
  console.log("\n✅ All checks passed! Pusher Beams is properly configured.");
  console.log("\n📋 Next steps:");
  console.log("   1. Start the app: bun run dev:vercel");
  console.log("   2. Open browser and check console for:");
  console.log("      - 'Successfully registered and subscribed!'");
  console.log("   3. Grant notification permission when prompted");
  console.log("   4. Check DevTools → Application → Service Workers\n");
  process.exit(0);
} else {
  console.log("\n❌ Some checks failed. Please fix the issues above.\n");
  process.exit(1);
}

