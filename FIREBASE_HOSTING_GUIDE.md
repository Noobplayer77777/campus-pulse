# Firebase Hosting Deployment Guide

## Prerequisites

1. **Node.js & npm** - Install from https://nodejs.org/
2. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase Account** - Create at https://firebase.google.com/
4. **Project Created in Firebase Console**

## Initial Setup

### 1. Login to Firebase
```bash
firebase login
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify Configuration
- `.env` - Contains development environment variables
- `.env.production` - Contains production environment variables
- `.firebaserc` - Contains Firebase project configuration
- `firebase.json` - Contains Firebase hosting & rules configuration

## Build Process

### Development
```bash
npm start
```
Runs on `http://localhost:3000` with hot reload.

### Production Build
```bash
npm run build
```
Creates optimized build in `/build` folder (no source maps).

## Deployment

### Deploy Everything (Build + Firebase)
```bash
npm run deploy:all
```
This will build the app and deploy to Firebase hosting, Firestore, and Storage.

### Deploy Only Hosting
```bash
firebase deploy --only hosting
```
Deploys the built `/build` folder to Firebase hosting.

### Deploy Only Security Rules
```bash
npm run deploy:rules
```
Deploys Firestore and Storage rules.

### Deploy to Production
```bash
npm run deploy:prod
```
Builds with production environment and deploys everything.

## Local Testing

### Test Firebase Hosting Locally
```bash
firebase serve
```
or
```bash
npm run serve
```
Runs Firebase emulator on `http://localhost:5000`

### Test Only Hosting
```bash
npm run serve:hosting
```

## File Structure for Deployment

```
college-events/
├── build/                    # Production build (created by npm run build)
│   ├── index.html           # Main HTML
│   ├── static/              # CSS/JS bundles
│   └── ...
├── src/                     # Source code
├── public/                  # Static assets
├── .env                     # Development config
├── .env.production          # Production config
├── firebase.json            # Firebase config
├── firestore.rules          # Firestore security
├── storage.rules            # Storage security
├── .firebaserc              # Project config
└── package.json             # Dependencies
```

## Important Notes

### Environment Variables
- Development: Uses `.env`
- Production: Uses `.env.production`
- Firebase credentials must be valid in both

### Firestore Rules
- Stored in `firestore.rules`
- Defines who can read/write data
- Deploy with: `npm run deploy:rules`

### Storage Rules
- Stored in `storage.rules`
- Manages file uploads and downloads
- Deploy with: `npm run deploy:rules`

### Public Assets
- Static files in `/public` folder
- Cached for 1 year (long-term cache)
- `index.html` is not cached (must-revalidate)

## Troubleshooting

### Authentication Error
```bash
firebase logout
firebase login
```

### Project Not Set
Update or create `.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### Build Fails
```bash
npm run lint
npm run build
```

### Deploy Fails
Check Firebase project quota and ensure:
- Storage is enabled
- Firestore database created
- Authentication methods configured

## Performance Optimization

The build is optimized with:
- Code splitting (React Router lazy loading)
- Asset minification
- Browser caching headers
- Gzip compression
- Long-term caching (31536000s for static files)

## CI/CD Integration

To automate deployment with GitHub Actions, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: college-event-system-204e2
```

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Run development server |
| `npm run build` | Create production build |
| `npm run deploy:all` | Build and deploy everything |
| `npm run deploy:hosting` | Deploy only to hosting |
| `npm run deploy:rules` | Deploy only security rules |
| `npm run serve` | Test locally with Firebase emulator |
| `npm run lint` | Check code with ESLint |
| `firebase open hosting` | Open hosted site in browser |
| `firebase projects:list` | List Firebase projects |

## Support

For more information:
- Firebase Docs: https://firebase.google.com/docs/hosting
- React Docs: https://react.dev
- Firebase CLI: https://firebase.google.com/docs/cli
