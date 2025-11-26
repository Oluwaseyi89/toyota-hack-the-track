# Road Sense Race Analytics Dashboard - Real-time Motorsport Telemetry Platform

## 🏎️ Project Overview

A comprehensive real-time motorsport analytics dashboard built with Next.js 14, TypeScript, and modern web technologies. Provides live telemetry visualization, strategic insights, and performance analytics for racing teams.

## 🚀 Features & Capabilities

### Real-time Telemetry Monitoring
- Live vehicle metrics including speed, RPM, throttle, and brake inputs
- Sector time analysis and lap performance tracking
- Multi-vehicle team overview with position tracking
- Weather and track condition monitoring

### Advanced Strategy Analytics
- AI-powered pit strategy recommendations (Undercut/Overcut/Early/Middle/Late stops)
- Optimal pit window predictions with confidence scoring
- Tire wear analysis and health monitoring
- Fuel strategy optimization and consumption tracking

### Performance Visualization
- Interactive tire wear gauges with temperature and pressure monitoring
- Real-time metrics dashboard with historical data comparison
- Strategy timeline with alternative scenario planning
- Pace chart analysis and lap time trends

## 🏗️ Architecture & Tech Stack

### Frontend Framework
- Next.js 14 with App Router and React 18
- TypeScript for type-safe development
- Tailwind CSS for responsive styling
- shadcn/ui components for consistent UI

### State Management
- Zustand stores with slice pattern for modular state management
- useRootStore hook unifying telemetry, strategy, and UI states
- Real-time data synchronization across components

### Data Integration
- Live telemetry data streaming
- Weather and track condition APIs
- Machine learning strategy predictions
- Historical performance analytics


## 📁 Project Structure

```
    src/
    ├── app/                    # Next.js 14 App Router
    │   ├── dashboard/         # Protected dashboard routes
    │   │   ├── layout.tsx    # Dashboard layout wrapper
    │   │   ├── loading.tsx   # Loading states
    │   │   └── page.tsx      # Main dashboard page
    │   ├── login/            # Authentication pages
    │   │   └── page.tsx
    │   ├── register/
    │   │   └── page.tsx
    │   ├── layout.tsx        # Root layout
    │   ├── page.tsx          # Landing page
    │   └── globals.css       # Global styles
    ├── components/           # Reusable UI components
    │   ├── auth/            # Authentication components
    │   │   ├── LoginForm.tsx
    │   │   └── RegisterForm.tsx
    |   |   └── ProtectedRoute.tsx
    │   ├── dashboard/       # Dashboard-specific components
    │   │   ├── AlertsPanel.tsx      # System alerts
    │   │   ├── FuelIndicator.tsx    # Fuel level monitoring
    │   │   ├── PaceChart.tsx        # Performance charts
    │   │   ├── RealTimeMetrics.tsx  # Live telemetry display
    │   │   ├── StrategyTimeline.tsx # Race strategy visualization
    │   │   └── TireWearGauge.tsx    # Tire analysis
    │   └── ui/              # Base UI components (shadcn/ui)
    ├── store/               # Zustand state management
    │   ├── slices/          # Modular state slices
    │   ├── useRootStore.ts  # Unified store hook
    │   └── AuthProvider.tsx # Authentication context
```

## 🔐 Authentication & Security
- Protected route implementation with ProtectedRoute component

- JWT-based authentication flow

- Role-based access control for team members

- Secure API endpoint protection


## 📊 Data Visualization Components

### RealTimeMetrics.tsx
- Live telemetry data display with best lap tracking

- Multi-vehicle position monitoring

- Weather and track condition integration

- Responsive metric card grid layout


### StrategyTimeline.tsx
- ML-powered strategy recommendations

- Optimal pit window calculations

- Tire and fuel strategy analytics

- Alternative strategy scenario planning


### TireWearGauge.tsx
- Real-time tire health monitoring

- Temperature and pressure analytics

- Wear prediction and status alerts

- Visual progress indicators


## 🎯 Key Performance Features
- Real-time Updates: Live telemetry streaming with WebSocket integration

- Responsive Design: Mobile-first approach for pit wall and garage displays

- Performance Optimized: Efficient re-rendering with Zustand state management

- Type Safety: Full TypeScript coverage for reliable development

- Accessibility: WCAG compliant components for diverse team needs



Built for professional motorsport teams seeking data-driven competitive advantages through real-time analytics and strategic insights.