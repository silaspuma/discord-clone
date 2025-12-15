# FullStack Discord Clone: Next.js 13, React, Firebase, Firestore, Tailwind & TypeScript.

**Migrated from Prisma/MySQL to Firebase!**

Credits: [Antonio Erdeljac](https://github.com/AntonioErdeljac)

Features:

- Client form validation and handling using react-hook-form
- POST, DELETE, and GET routes in route handlers (app/api & pages)
- Real-time messaging using Firestore real-time listeners
- Send attachments as messages using Firebase Storage
- Delete & Edit messages in real time for all users
- Create Text, Audio and Video call Channels
- 1:1 conversation between members
- 1:1 video calls between members
- Member management (Kick, Role change Guest / Moderator)
- Unique invite link generation & full working invite system
- Infinite loading for messages in batches of 10 (tanstack/query)
- Server creation and customization
- Beautiful UI using TailwindCSS and ShadcnUI
- Full responsivity and mobile UI
- Light / Dark mode
- Firestore real-time listeners with automatic updates
- NoSQL database using Firestore
- Authentication with Firebase Authentication
- File storage with Firebase Storage

### Prerequisites

**Node version 18.x.x**

### Cloning the repository

```shell
git clone https://github.com/silaspuma/discord-clone.git
```

### Install packages

```shell
npm install
```

### Setup Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Firebase Authentication (Email/Password provider)
5. Enable Firebase Storage
6. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

### Setup .env file

Create a `.env.local` file in the root directory:

```js
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (paste the entire service account JSON as a single line)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# LiveKit Configuration (for video/audio calls)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-url

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Setup Firestore Security Rules

In Firebase Console, go to Firestore Database > Rules and add:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles
    match /profiles/{profileId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Servers
    match /servers/{serverId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Members
    match /members/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Channels
    match /channels/{channelId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Messages
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Direct Messages
    match /directMessages/{directMessageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Setup Firebase Storage Rules

In Firebase Console, go to Storage > Rules and add:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Initialize Firestore Indexes

For optimal query performance, create these indexes in Firestore:

1. Collection: `messages`
   - Fields: `channelId` (Ascending), `createdAt` (Descending)

2. Collection: `directMessages`
   - Fields: `conversationId` (Ascending), `createdAt` (Descending)

3. Collection: `members`
   - Fields: `serverId` (Ascending), `profileId` (Ascending)

### Start the app

```shell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available commands

Running commands with npm `npm run [command]`

| command | description                              |
| :------ | :--------------------------------------- |
| `dev`   | Starts a development instance of the app |
| `lint`  | Run lint check                           |
| `build` | Start building app for deployment        |
| `start` | Run build version of app                 |

## Firebase Migration Notes

This project has been migrated from Prisma/MySQL to Firebase:

- **Database**: PostgreSQL/MySQL (Prisma) → Firestore (NoSQL)
- **Authentication**: Clerk → Firebase Authentication
- **Real-time**: Socket.io → Firestore Real-time Listeners
- **File Storage**: UploadThing → Firebase Storage

### Key Changes

1. All database operations now use Firestore with a Prisma-like API wrapper
2. Real-time updates are handled by Firestore listeners instead of Socket.io
3. Authentication uses Firebase Auth with session cookies
4. File uploads use Firebase Storage with automatic URL generation
5. No need for database migrations - Firestore is schema-less

### Deployment

For production deployment:

1. Build the app: `npm run build`
2. Deploy to Vercel, Netlify, or any Next.js hosting platform
3. Set environment variables in your hosting platform
4. Ensure Firebase project is in production mode
5. Update CORS settings in Firebase Storage if needed
