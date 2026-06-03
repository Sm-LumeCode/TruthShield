# TruthShield 🛡️

**TruthShield** is a dynamic, interactive web-based simulator designed to model, analyze, and mitigate the spread of misinformation across social networks. Built with React, TypeScript, and Vite, it serves as a powerful educational and research tool for analyzing graph algorithms in the context of network epidemiology.

---

## 🌟 Key Features

### 1. 📊 Interactive Dashboard
A real-time command center that gives you an overview of the network's health.
- Live statistics tracking Users, Connections, Communities, and Total Infections.
- **Simulation History**: Keeps a log of all past simulations and applied interventions, allowing you to track algorithmic performance over time.

### 2. 🌐 Social Feed
Live monitoring of network activity through a customized, X/Twitter-style interface.
- Filters to sort by All Posts, Flagged Misinformation, and Most Shared.
- Interactive actions to flag posts and view simulated user profiles.

### 3. 🕸️ Network Graph (Cytoscape.js)
A fully interactive visualization of the 100-node social graph.
- **Community Detection**: Uses a heuristic, Louvain-inspired algorithm to cluster the network into 5 modular communities.
- **Dynamic Styling**: Node sizes dynamically scale based on their in-degree (follower count).
- **Infection Visualization**: Infected nodes pulse in red, while protected nodes feature a green shield overlay.
- Complete control panel for layout switching (Grid, Circular, Force-directed) and zooming.

### 4. 📈 Spread Simulation (BFS)
Models the rapid transmission of fake news starting from a "Patient Zero".
- Powered by a probabilistic **Breadth-First Search (BFS)** traversal algorithm.
- Interactive controls allow you to tweak the **Spread Probability** parameter.
- Features live infection rate tracking and a step-by-step animated visual timeline mapping out infection waves.

### 5. 🛡️ Algorithmic Intervention
Battle-tests two distinct algorithmic strategies designed to halt misinformation.
- **Degree Centrality**: An $O(V+E)$ heuristic approach that calculates in-degrees to isolate and protect the network's largest hubs.
- **Greedy Optimization**: An exhaustive $O(K \cdot V \cdot (V+E))$ algorithm that tests all possible intervention combinations to mathematically minimize spread.
- Instantly visualizes the percentage reduction and highlights the selected nodes against a controlled deterministic baseline.

### 6. 📉 Analytics Dashboard (Recharts)
A comprehensive $2 \times 2$ grid of analytics comparing the strategies.
- Side-by-side Bar Charts comparing infection counts for *Baseline, Random, Degree, and Greedy*.
- Cumulative Infection Wave line charts tracking velocity over time.
- Pie charts identifying highest-risk communities.
- Horizontal ranking of Top 10 Influencers and their protection status.
- Export results directly to JSON.

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository and navigate into the directory:
   ```bash
   cd TruthShield
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the provided localhost URL in your browser to access TruthShield.

### Navigation Shortcuts
- Press <kbd>R</kbd> anywhere to quickly jump to the **Spread Simulation**.
- Press <kbd>I</kbd> anywhere to jump to the **Intervention Strategies** page.
- Toggle the **Dark/Light Theme** using the moon/sun icon in the top navigation bar.

---

## 🛠️ Technology Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **Animations**: Framer Motion
- **Graph Visualization**: Cytoscape.js & react-cytoscapejs
- **Charts**: Recharts
- **Icons**: Lucide React

---

*TruthShield · Design & Analysis of Algorithms · Graph Algorithms · Social Network Simulation*
