# 🚀 Assessment Wallet Application

## 📌 Overview
This is a Node.js-based wallet application that provides functionalities like wallet creation, wallet balance retrieval, transactions, and transaction history. The application is built using **Express.js**.

---

## 🛠 Prerequisites
Before setting up the project, ensure you have the following installed on your system:

- **Node.js** (v22+ recommended) → [Download Here](https://nodejs.org/)
- **npm** (Node Package Manager)
- **.env** file configured

---

## ⚙️ Environment Setup
1. Create a **`.env`** file in the root directory.
2. Add the following environment variables:

```plaintext
PORT=8080
NETWORK="testnet"
BLOCKBOOKURL="https://tbtc1.trezor.io/"
TESTNETDERIVATIONPATH="m/84'/1'/0'"
MAINNETDERIVATIONPATH="m/84'/1'/0'"
DERIVATIONINDEX=0
```

## ⚙️ Installation

### **Step 1: Clone the Repository**
```sh
git clone https://github.com/your-repo/wallet-app.git
cd wallet-app
npm install
node index.js
