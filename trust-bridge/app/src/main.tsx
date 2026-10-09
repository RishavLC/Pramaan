import React from "react";
import ReactDOM from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import "@solana/wallet-adapter-react-ui/styles.css";
import App from "./App";
import { RPC_URL } from "./lib/config";
import { logWalletError } from "./lib/walletErrors";
import "./styles.css";

// Created once at module scope so the adapter instance is stable across renders / StrictMode.
const wallets = [new PhantomWalletAdapter()];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: "confirmed" }}>
      {/* autoConnect is off on purpose: WalletStatus is the single place that calls connect(). Two concurrent
            connect requests make Phantom fail with "Unexpected error". */}
      <WalletProvider wallets={wallets} autoConnect={false} onError={logWalletError}>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
