# AgroFresh Ghana Market

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern e-commerce platform connecting farmers directly with buyers in Ghana, providing a seamless marketplace for agricultural products.
# 🌾 AgroFresh - AI-Powered Agricultural E-Commerce Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18%2B-61dafb)](https://react.dev/)

**A modern, AI-powered agricultural marketplace connecting farmers directly with buyers in Ghana.**

A full-stack platform with machine learning for crop quality analysis, harvest prediction, freshness tracking, and intelligent price forecasting.

## ⚡ Quick Start

### Prerequisites
- Node.js 18+, Python 3.10+, pnpm/npm

### Setup (3 minutes)

```bash
# 1. Clone & install
git clone https://github.com/Dee-Rock/Agrofresh.git && cd Agrofresh

# 2. Backend
cd backend && npm install && npm run dev &

# 3. ML Service
cd ../backend-ml && python3 -m venv venv
source venv/bin/activate && pip install -r requirements.txt
uvicorn app:app --reload --port 8001 &

# 4. Frontend
cd ../src && pnpm install && pnpm dev
```

**Access**: 
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- ML API: http://localhost:8001

---

## 🌟 Key Features

### 🤖 AI/ML Capabilities
- **YOLOv5-Inspired Quality Analysis** (v1.0): Defect detection, color analysis (65-95% confidence)
- **Regional Harvest Prediction** (v1.0): 14 Ghana regions, climate calibration (68-75% confidence)
- **Freshness Calculator** (v1.0): Storage-aware degradation modeling
- **Seasonal Price Forecaster** (v1.0): Quality + freshness-based pricing

### 🚜 For Farmers
- Crop management with AI quality insights
- Real-time quality scoring for produce images
- Harvest date prediction with regional adjustments
- Price forecasting & optimal selling time recommendations
- Freshness tracking based on storage conditions
- Sales analytics & payment tracking

### 🛒 For Buyers
- Browse fresh crops from verified farmers
- View AI quality scores and defect detection
- Real-time order tracking
- Secure in-app reviews & ratings

### 👨‍💼 For Admins
- Platform-wide monitoring & analytics
- User & crop management
- ML model oversight

## 🌟 Features

- **Farmer Profiles**: Farmers can create profiles and list their products
- **Product Catalog**: Browse and search for fresh agricultural products
- **Secure Payments**: Integrated payment processing
- **Order Management**: Track orders from placement to delivery
- **User Reviews**: Rate and review products and sellers

## 📦 Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- MySQL (v5.7 or later)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/agrofresh-ghana-market.git
   cd agrofresh-ghana-market
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the backend directory with the following:
   ```
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASS=your_password
   DB_NAME=agrofresh
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the development servers**
   ```bash
   # Start backend server
   cd backend
   npm run dev
   
   # In a new terminal, start frontend
   cd frontend
   npm start
   ```

## 📚 Documentation

For detailed documentation, architecture diagrams, and API references, please see our [Documentation](./DOCUMENTATION.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please read our [Contribution Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Contact

For any questions or feedback, please contact us at [delalirock5@gmail.com](delalirock5@gmail.com)

---


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d5ef4a0f-e801-4992-b7ef-8e25e4b770a3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
