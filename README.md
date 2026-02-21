# Keycloak OIDC Demo with Modern RBAC

A modern Node.js application demonstrating OpenID Connect (OIDC) integration with Keycloak, featuring a premium glassmorphic UI, robust Role-Based Access Control (RBAC), and global session termination.

## 🚀 Features

- **Authentication**: Secure login flow using `openid-client`.
- **Authorization (RBAC)**: Granular access control for `Admin`, `Moderator`, and `User` roles.
- **Modern UI**: Dark-themed, glassmorphic design system built with Vanilla CSS and EJS.
- **Global Logout**: Implements OIDC `end_session_endpoint` to terminate both local and Keycloak sessions.
- **Automated Setup**: Pre-configured realm export for instant deployment.

## 🛠 Tech Stack

- **Backend**: Node.js, Express
- **Identity Provider**: Keycloak
- **View Engine**: EJS
- **Styling**: Vanilla CSS (Custom System)
- **Library**: `openid-client`

## 🚦 Quick Start

### 1. Start Keycloak
Run Keycloak using Docker with the pre-configured realm:
```bash
docker rm -f keycloak-EAD

docker run -d --name keycloak-EAD \
-p 8080:8080 \
-e KEYCLOAK_ADMIN=admin \
-e KEYCLOAK_ADMIN_PASSWORD=admin \
-v $(pwd)/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro \
quay.io/keycloak/keycloak:latest start-dev --import-realm

docker logs -f keycloak-EAD
```

### 2. Configure Environment
Create a `.env` file:
```env
KEYCLOAK_ISSUER=http://localhost:8080/realms/enterprise-realm
CLIENT_ID=node-app
CLIENT_SECRET=node-app-client-secret
REDIRECT_URI=http://localhost:3000/callback
SESSION_SECRET=your_secret_here
```

### 3. Run Application
```bash
npm install
node app.js
node app2.js
```

## 👥 Test Users
| Username | Password | Roles |
| :--- | :--- | :--- |
| `manager` | `1234` | admin, user |
| `staff` | `1234` | moderator, user |
| `bryan` | `1234` | user |

---
*Created with for Enterprise Application Development.*
