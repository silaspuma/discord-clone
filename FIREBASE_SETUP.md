# Firebase Migration Guide

This document provides detailed instructions for setting up and using Firebase with this Discord clone application.

## Table of Contents

1. [Firebase Project Setup](#firebase-project-setup)
2. [Environment Configuration](#environment-configuration)
3. [Firestore Database](#firestore-database)
4. [Firebase Authentication](#firebase-authentication)
5. [Firebase Storage](#firebase-storage)
6. [Real-time Features](#real-time-features)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Firebase Project Setup

### Step 1: Create a Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a Project"
3. Enter a project name (e.g., "discord-clone")
4. Enable/disable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Register Your App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Register app with a nickname (e.g., "Discord Clone Web")
3. Copy the Firebase configuration object
4. Save it for later use in your `.env.local` file

### Step 3: Enable Services

#### Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (we'll add security rules later)
4. Select a location close to your users
5. Click "Enable"

#### Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

#### Enable Storage

1. In Firebase Console, go to "Storage"
2. Click "Get started"
3. Choose "Start in production mode"
4. Select the same location as Firestore
5. Click "Done"

### Step 4: Generate Service Account Key

1. Go to Project Settings (gear icon) > Service Accounts
2. Click "Generate New Private Key"
3. Click "Generate Key" to download the JSON file
4. **IMPORTANT**: Keep this file secure and never commit it to version control
5. You'll use this JSON content in your `.env.local` file

## Environment Configuration

Create a `.env.local` file in your project root:

```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK
# Paste the entire service account JSON as a single line
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}

# LiveKit (for video/audio calls)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Getting Firebase Configuration Values

You can find these values in Firebase Console:

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click on your web app
4. Copy the config values from the `firebaseConfig` object

## Firestore Database

### Data Model

The application uses the following Firestore collections:

```
/profiles/{profileId}
  - id: string
  - userId: string (Firebase Auth UID)
  - name: string
  - imageUrl: string
  - email: string
  - createdAt: timestamp
  - updatedAt: timestamp

/servers/{serverId}
  - id: string
  - name: string
  - imageUrl: string
  - inviteCode: string (unique)
  - profileId: string (reference to profiles)
  - createdAt: timestamp
  - updatedAt: timestamp

/members/{memberId}
  - id: string
  - role: string (ADMIN, MODERATOR, GUEST)
  - profileId: string (reference to profiles)
  - serverId: string (reference to servers)
  - createdAt: timestamp
  - updatedAt: timestamp

/channels/{channelId}
  - id: string
  - name: string
  - type: string (TEXT, AUDIO, VIDEO)
  - profileId: string (reference to profiles)
  - serverId: string (reference to servers)
  - createdAt: timestamp
  - updatedAt: timestamp

/messages/{messageId}
  - id: string
  - content: string
  - fileUrl: string (optional)
  - memberId: string (reference to members)
  - channelId: string (reference to channels)
  - deleted: boolean
  - createdAt: timestamp
  - updatedAt: timestamp

/directMessages/{directMessageId}
  - id: string
  - content: string
  - fileUrl: string (optional)
  - memberId: string (reference to members)
  - conversationId: string (reference to conversations)
  - deleted: boolean
  - createdAt: timestamp
  - updatedAt: timestamp

/conversations/{conversationId}
  - id: string
  - memberOneId: string (reference to members)
  - memberTwoId: string (reference to members)
```

### Security Rules

In Firebase Console, go to Firestore Database > Rules and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Profiles
    match /profiles/{profileId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }
    
    // Servers
    match /servers/{serverId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Members
    match /members/{memberId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Channels
    match /channels/{channelId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Messages
    match /messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Direct Messages
    match /directMessages/{directMessageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

Click "Publish" to apply the rules.

### Composite Indexes

Create these indexes for optimal query performance:

1. **messages** collection:
   - Fields: `channelId` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

2. **directMessages** collection:
   - Fields: `conversationId` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

3. **members** collection:
   - Fields: `serverId` (Ascending), `profileId` (Ascending)
   - Query scope: Collection

To create indexes:
1. Go to Firestore Database > Indexes
2. Click "Add Index"
3. Select collection and add fields as specified above
4. Click "Create Index"

Alternatively, Firestore will suggest creating indexes when you run queries that need them. You can click the provided link in the error message to create the index automatically.

## Firebase Authentication

### Setting Up Authentication

The app uses Firebase Authentication with Email/Password:

1. Users sign up with email and password
2. Firebase Auth creates a user account
3. A session cookie is created for the user
4. The session cookie is used for subsequent requests

### Authentication Flow

1. **Sign Up**:
   ```typescript
   import { createUserWithEmailAndPassword } from "firebase/auth";
   import { auth } from "@/lib/firebase";
   
   const result = await createUserWithEmailAndPassword(auth, email, password);
   ```

2. **Sign In**:
   ```typescript
   import { signInWithEmailAndPassword } from "firebase/auth";
   
   const result = await signInWithEmailAndPassword(auth, email, password);
   ```

3. **Get ID Token**:
   ```typescript
   const idToken = await auth.currentUser?.getIdToken();
   ```

4. **Create Session Cookie**:
   ```typescript
   await fetch("/api/auth/session", {
     method: "POST",
     body: JSON.stringify({ idToken }),
   });
   ```

### Custom Claims (Optional)

You can add custom claims for roles:

```typescript
import { adminAuth } from "@/lib/firebase-admin";

await adminAuth.setCustomUserClaims(uid, {
  admin: true,
  moderator: false,
});
```

## Firebase Storage

### Storage Structure

Files are organized by type:

```
/servers/{serverId}/{timestamp}_{filename}
/messages/{channelId}/{timestamp}_{filename}
/direct-messages/{conversationId}/{timestamp}_{filename}
```

### Storage Rules

In Firebase Console, go to Storage > Rules and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper function to check authentication
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Allow read/write for authenticated users
    match /{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() 
                   && request.resource.size < 10 * 1024 * 1024 // 10MB limit
                   && request.resource.contentType.matches('image/.*|application/pdf');
    }
  }
}
```

Click "Publish" to apply the rules.

### Uploading Files

Use the upload API endpoint:

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("uploadType", "message"); // or "server", "direct-message"
formData.append("entityId", channelId);

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const { url } = await response.json();
```

## Real-time Features

### Firestore Real-time Listeners

The app uses Firestore's real-time listeners instead of Socket.io:

```typescript
import { useFirestoreChat } from "@/hooks/use-firestore-chat";

// In your component
useFirestoreChat({
  channelId,
  queryKey: `chat:${channelId}`,
  collectionName: "messages",
});
```

### How It Works

1. Client sets up a listener on a Firestore collection
2. When documents are added/modified/deleted, Firestore sends updates
3. The hook updates React Query cache automatically
4. UI re-renders with new data

### Benefits Over Socket.io

- Automatic reconnection
- Offline support with local cache
- Simplified server code (no Socket.io server needed)
- Better scalability
- Built-in security with Firestore rules

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Firebase Hosting (Alternative)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy --only hosting
```

### Environment Variables for Production

Make sure to set these in your hosting platform:

- All `NEXT_PUBLIC_*` variables
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- LiveKit credentials
- `NEXT_PUBLIC_SITE_URL` (your production URL)

### Production Checklist

- [ ] Set Firestore security rules to production mode
- [ ] Set Storage security rules to production mode
- [ ] Enable Firebase App Check (optional, for security)
- [ ] Set up Firebase monitoring and alerts
- [ ] Configure CORS for Firebase Storage if needed
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Test real-time messaging
- [ ] Set up Firebase budget alerts

## Troubleshooting

### Common Issues

#### 1. "Permission Denied" Errors

**Problem**: Cannot read/write to Firestore

**Solution**: 
- Check Firestore security rules
- Ensure user is authenticated
- Verify session cookie is valid

#### 2. "Index Required" Errors

**Problem**: Query needs an index

**Solution**:
- Click the link in the error message to create the index
- Or manually create the index in Firestore Console

#### 3. Real-time Updates Not Working

**Problem**: Messages don't appear in real-time

**Solution**:
- Check browser console for errors
- Verify Firestore rules allow read access
- Ensure useFirestoreChat hook is properly set up
- Check network tab for WebSocket connections

#### 4. File Upload Fails

**Problem**: Cannot upload files to Storage

**Solution**:
- Check Storage security rules
- Verify file size is under limit (10MB)
- Ensure file type is allowed (images, PDFs)
- Check Storage bucket exists and is accessible

#### 5. Authentication Issues

**Problem**: Cannot sign in or session expires

**Solution**:
- Check Firebase Auth is enabled
- Verify Email/Password provider is enabled
- Check session cookie configuration
- Ensure FIREBASE_SERVICE_ACCOUNT_KEY is correct

### Debug Mode

Enable debug mode for Firebase:

```typescript
// In lib/firebase.ts
import { setLogLevel } from "firebase/app";

if (process.env.NODE_ENV === "development") {
  setLogLevel("debug");
}
```

### Getting Help

- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: Tag questions with `firebase` and `firestore`

## Migration from Prisma/MySQL

If you're migrating from the original Prisma/MySQL setup:

### Data Migration

1. Export data from MySQL using Prisma:
   ```bash
   npx prisma studio
   # Export each table to JSON
   ```

2. Create a migration script to import to Firestore:
   ```typescript
   import { adminDb } from "@/lib/firebase-admin";
   import * as fs from "fs";
   
   // Read exported JSON
   const profiles = JSON.parse(fs.readFileSync("profiles.json"));
   
   // Import to Firestore
   for (const profile of profiles) {
     await adminDb.collection("profiles").doc(profile.id).set({
       ...profile,
       createdAt: new Date(profile.createdAt),
       updatedAt: new Date(profile.updatedAt),
     });
   }
   ```

### Key Differences

| Feature | Prisma/MySQL | Firebase |
|---------|-------------|----------|
| Database | Relational (MySQL) | NoSQL (Firestore) |
| Queries | SQL | Firestore queries |
| Joins | Native SQL joins | Client-side joins |
| Real-time | Socket.io | Firestore listeners |
| Auth | Clerk | Firebase Auth |
| Storage | UploadThing | Firebase Storage |
| Migrations | Prisma migrate | Schema-less |

### Advantages of Firebase

- No database server management
- Built-in real-time capabilities
- Automatic scaling
- Offline support
- Integrated authentication
- Unified platform (database, auth, storage, hosting)
- Generous free tier

---

For more detailed information, visit the [Firebase Documentation](https://firebase.google.com/docs).
