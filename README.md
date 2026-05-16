# Campus Pulse 🎓

A comprehensive college event management platform built with React, Firebase, and modern web technologies. Campus Pulse helps students discover, register for, and manage campus events while providing clubs and administrators with powerful tools to organize and promote their events.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Deploying to Firebase Hosting](#deploying-to-firebase-hosting)
- [Key Features Explained](#key-features-explained)
- [API & Services](#api--services)
- [Cloud Functions](#cloud-functions)
- [Security Rules](#security-rules)
- [Mobile Optimization](#mobile-optimization)
- [Contributing](#contributing)

## ✨ Features

### For Students
- **Event Discovery**: Browse and search for upcoming college events
- **Event Recommendations**: AI-powered event suggestions based on interests
- **Event Registration**: Easy registration and ticket management
- **Google Calendar Integration**: Export events to Google Calendar
- **Personalized Dashboard**: View registered events and recommendations
- **User Profile**: Manage interests and preferences
- **Push Notifications**: Stay updated with event reminders
- **Chatbot Support**: AI assistant for event-related queries

### For Clubs
- **Event Management**: Create, update, and manage events
- **Event Analytics**: View registration and attendance statistics
- **Club Dashboard**: Manage all club-related events and members
- **Event Promotion**: Tools to promote events to students

### For Administrators
- **System Management**: Oversee all events and users
- **User Management**: Manage students, clubs, and staff
- **Event Moderation**: Approve and monitor events
- **Analytics Dashboard**: View platform-wide statistics
- **System Configuration**: Configure settings and rules

## 🛠 Tech Stack

### Frontend
- **React 18**: UI library with hooks and context API
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **JavaScript (ES6+)**: Modern JavaScript features

### Backend & Services
- **Firebase Firestore**: Real-time database
- **Firebase Authentication**: User authentication and authorization
- **Firebase Hosting**: Application hosting
- **Firebase Cloud Functions**: Serverless backend logic
- **Firebase Storage**: File and media storage

### External APIs & Services
- **Google Calendar API**: Calendar integration for event export
- **Google OAuth 2.0**: Secure authentication

### Development Tools
- **npm**: Package management
- **Git**: Version control
- **VS Code**: Recommended IDE

## 📁 Project Structure

```
college-events/
├── public/                    # Static public files
├── src/
│   ├── components/           # Reusable React components
│   │   ├── Calendar.jsx
│   │   ├── ChatbotWidget.jsx
│   │   ├── GoogleCalendarExport.jsx
│   │   ├── Layout.jsx
│   │   ├── LoginForm.jsx
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── RecommendationCard.jsx
│   │   ├── Sidebar.jsx
│   │   ├── SignupForm.jsx
│   │   └── Toast.jsx
│   ├── pages/                # Page components
│   │   ├── Home.jsx
│   │   ├── AuthPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── ClubDashboard.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── Profile.jsx
│   │   └── OAuthCallback.jsx
│   ├── services/             # API and business logic services
│   │   ├── authService.js
│   │   ├── eventsService.js
│   │   ├── registrationsService.js
│   │   ├── clubsService.js
│   │   ├── calendarService.js
│   │   ├── locationsService.js
│   │   └── expiredEventsService.js
│   ├── context/              # React context for state management
│   │   ├── AuthContext.jsx
│   │   ├── EventsContext.jsx
│   │   └── UIContext.jsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useEvents.js
│   │   ├── useChatbot.js
│   │   ├── useCalendar.js
│   │   ├── useRecommendations.js
│   │   └── useUI.js
│   ├── firebase/             # Firebase configuration
│   │   └── config.js
│   ├── ai/                   # AI and recommendation logic
│   │   ├── aiConfig.js
│   │   ├── chatbot.js
│   │   ├── mockChatbot.js
│   │   └── recommender.js
│   ├── utils/                # Utility functions
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── styles/               # Global and component styles
│   │   ├── ChatbotWidget.css
│   │   └── RecommendationCard.css
│   ├── tokens/               # Design system tokens
│   │   ├── designTokens.js
│   │   └── campuspulseTokens.js
│   ├── App.js               # Main application component
│   ├── App.css              # Main application styles
│   ├── index.js             # Application entry point
│   └── index.css            # Global styles
├── functions/                # Firebase Cloud Functions
│   ├── index.js
│   └── package.json
├── build/                    # Production build (generated)
├── firebase.json             # Firebase configuration
├── firestore.rules           # Firestore security rules
├── storage.rules             # Storage security rules
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── package.json              # Project dependencies
└── .env.production          # Production environment variables (not in git)
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account with a project created
- Google Cloud project with Calendar API enabled

### Step 1: Clone the Repository
```bash
git clone https://github.com/Noobplayer77777/campus-pulse.git
cd college-events
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Install Cloud Functions Dependencies
```bash
cd functions
npm install
cd ..
```

## 🔑 Environment Variables

Create a `.env.production` file in the root directory (this file is gitignored for security):

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret

# App Configuration
REACT_APP_API_BASE_URL=https://your-firebase-project.firebaseapp.com
```

## 💻 Running the Application

### Development Mode
```bash
npm start
```
The application will open at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Run Emulator (Optional)
For local Firebase development:
```bash
firebase emulators:start
```

## 🔨 Building for Production

### Build the Application
```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## 🚀 Deploying to Firebase Hosting

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`

### Deploy Steps
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy everything (hosting, functions, rules)
firebase deploy

# Deploy specific resources
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## 🎯 Key Features Explained

### 1. **Authentication System**
- Email/Password signup and login
- Google OAuth integration
- Protected routes for different user roles
- Persistent authentication with Firebase

### 2. **Event Management**
- CRUD operations for events
- Event filtering and search
- Event categories and tags
- Event location management
- Expired event cleanup service

### 3. **Google Calendar Integration**
- Export events to Google Calendar
- OAuth callback handling
- Calendar synchronization

### 4. **AI-Powered Recommendations**
- Event recommendation engine
- Interest-based suggestions
- Mock AI for development

### 5. **Chatbot Widget**
- AI assistant for event queries
- Integration with recommendation system
- Mock responses for development

### 6. **Mobile Optimization**
- Responsive design with Tailwind CSS
- Mobile-friendly navigation
- Touch-optimized UI components
- See [MOBILE_OPTIMIZATION_GUIDE.md](./MOBILE_OPTIMIZATION_GUIDE.md) for details

### 7. **User Dashboards**
- **Student Dashboard**: View events and recommendations
- **Club Dashboard**: Manage club events
- **Admin Dashboard**: System-wide management

## 📡 API & Services

### Authentication Service (`services/authService.js`)
- User signup and login
- Google OAuth authentication
- Token management
- User profile management

### Events Service (`services/eventsService.js`)
- Fetch all events
- Create new events
- Update events
- Delete events
- Filter and search events

### Registrations Service (`services/registrationsService.js`)
- Register user for events
- Cancel registrations
- View user registrations
- Get registration statistics

### Calendar Service (`services/calendarService.js`)
- Export events to Google Calendar
- Handle OAuth flow
- Sync calendar data

### Clubs Service (`services/clubsService.js`)
- Manage club information
- Get club events
- Update club details

### Locations Service (`services/locationsService.js`)
- Fetch available locations
- Create new locations
- Update location details

### Expired Events Service (`services/expiredEventsService.js`)
- Clean up expired events
- Archive old events
- Manage event lifecycle

## ☁️ Cloud Functions

Cloud Functions handle backend logic including:
- User creation and profile setup
- Event validation and processing
- Email notifications
- Data transformation and aggregation
- Scheduled tasks for cleanup

See `functions/index.js` for implementation details.

## 🔒 Security Rules

### Firestore Rules (`firestore.rules`)
- Role-based access control (RBAC)
- User-specific data protection
- Admin-only operations
- Event creator permissions

### Storage Rules (`storage.rules`)
- User-specific file access
- Public event media access
- Admin file management

## 📱 Mobile Optimization

The application is fully optimized for mobile devices with:
- Responsive layout using Tailwind CSS
- Mobile-first design approach
- Touch-friendly navigation
- Optimized images and assets
- Mobile-specific components

See [MOBILE_OPTIMIZATION_GUIDE.md](./MOBILE_OPTIMIZATION_GUIDE.md) for detailed information.

## 📚 Additional Documentation

- [Google Calendar Integration Guide](./GOOGLE_CALENDAR_INTEGRATION_EXAMPLE.js)
- [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md)
- [Firebase Hosting Guide](./FIREBASE_HOSTING_GUIDE.md)
- [Mobile Optimization Guide](./MOBILE_OPTIMIZATION_GUIDE.md)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

### Code Standards
- Use ES6+ JavaScript features
- Follow React best practices with hooks
- Use meaningful component and variable names
- Add comments for complex logic
- Keep components small and focused

## 📝 License

This project is private and owned by me.

## 🆘 Support

For issues, questions, or suggestions:
- Check existing issues on GitHub
- Create a new issue with detailed description
- Contact the development team

## 👥 Project Team

Campus Pulse is developed and maintained by me OFC.

---

**Campus Pulse** - Bringing the campus community together through events! 🎉

Last Updated: April 2026
