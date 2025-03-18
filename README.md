### Location Service

## Overview

The Location Service manages location-related functionality for the Commune Drop platform. It tracks user and carrier locations, calculates distances and routes, handles geocoding, and provides real-time location updates for order tracking.

## Features

- Real-time location tracking for users and carriers
- Distance and ETA calculations between locations
- Geocoding and reverse geocoding
- Route optimization
- Location history storage
- Geofencing for delivery zones
- Address validation and normalization


## Dependencies

- Auth Service: For user authentication and authorization
- Order Service: For order location details
- Notification Service: For location-based alerts
- External Map Services: For geocoding and routing (Google Maps, Mapbox, etc.)


## Technology Stack

- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB with geospatial indexes
- Real-time: Socket.io / WebSockets
- Caching: Redis
- External APIs: Google Maps / Mapbox / OpenStreetMap


## Setup

### Prerequisites

- Node.js v16+
- MongoDB
- Redis
- Map service API keys


### Quick Start

1. Clone the repository


```shellscript
git clone https://github.com/commune-drop/location-service.git
cd location-service
```

2. Install dependencies


```shellscript
npm install
```

3. Configure environment variables


```shellscript
cp .env.example .env
# Edit .env with your configuration
```

4. Start the service


```shellscript
npm start
```

For development:

```shellscript
npm run dev
```

## Configuration

Key environment variables:

```plaintext
PORT=3002
MONGODB_URI=mongodb://localhost:27017/location-service
AUTH_SERVICE_URL=http://auth-service:3000
ORDER_SERVICE_URL=http://order-service:3001
NOTIFICATION_SERVICE_URL=http://notification-service:3005
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_API_KEY=your_mapbox_api_key
LOCATION_UPDATE_INTERVAL=10000
LOCATION_HISTORY_RETENTION_DAYS=30
```

## Geospatial Features

- Proximity search for nearby carriers
- Polygon-based delivery zones
- Heatmaps for demand analysis
- Traffic-aware routing
- Location clustering


## Data Models

Key data structures include:

- User locations
- Carrier locations
- Location history
- Delivery zones
- Address data


## Real-time Updates

The service provides real-time location updates via:

- WebSockets for live tracking
- Server-sent events for status updates
- Pub/sub for internal service communication


## Events

The service publishes these events:

- `location.updated`
- `location.entered_zone`
- `location.exited_zone`
- `carrier.nearby`
- `eta.updated`


## Privacy and Security

- Location data is encrypted at rest
- User consent required for location tracking
- Configurable location precision
- Automatic data purging based on retention policy


## License

MIT
